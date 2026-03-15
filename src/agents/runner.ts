import { getTaskById, updateTaskStatus } from '../main/db/tasks'
import { getAgentById, getAllAgents } from '../main/db/agents'
import { addActivityLog } from '../main/db/documents'
import { getDb } from '../main/db/schema'
import { getMemoriesForTask, markMemoriesUsed, createMemory, getMemories } from '../main/db/memories'
import { getAgentFiles, getAgentFile, saveAgentFile } from '../main/db/agentFiles'
import type { AgentFileRow } from '../main/db/agentFiles'
import { routeRequest, runWithRouter } from '../api/router'
import { v4 as uuidv4 } from 'uuid'

type LogCallback = (message: string) => void
type ProgressCallback = (progress: number) => void

// ─── Agent files context injection ────────────────────────────────────────────

function buildAgentFilesBlock(agentId: string, clientId?: string | null): string {
  const allFiles = getAgentFiles(agentId)
  const fileMap = new Map(allFiles.map(f => [f.filename, f]))

  // For IDENTITY: prefer client-specific file, fall back to global
  const identity = (clientId && fileMap.get(`IDENTITY-${clientId}.md`)) || fileMap.get('IDENTITY.md')

  const slots = [
    fileMap.get('SOUL.md'),
    identity,
    fileMap.get('TOOLS.md'),
    fileMap.get('MEMORY.md'),
  ].filter((f): f is AgentFileRow => !!f && f.content.trim().length > 0)

  if (slots.length === 0) return ''

  const FILE_MAX_CHARS = 8000  // ≈2000 tokens — prevents single file from dominating context
  const sections = slots.map(f => {
    const displayName = f.filename.startsWith('IDENTITY-') ? 'IDENTITY.md' : f.filename
    const body = f.content.trim()
    const truncated = body.length > FILE_MAX_CHARS ? body.slice(0, FILE_MAX_CHARS) + '\n…[truncated]' : body
    return `### ${displayName}\n${truncated}`
  }).join('\n\n')

  return `\n\n## Agent Memory & Skills\n_If IDENTITY.md above specifies a project stack or conventions, those take priority. Always follow the target project's existing patterns and defer to what IDENTITY.md says._\n\n${sections}`
}

// ─── Memory context injection ─────────────────────────────────────────────────

function buildMemoryContext(agentId: string, clientId: string | null, taskDescription: string): {
  contextBlock: string
  usedIds: string[]
} {
  const memories = getMemoriesForTask(agentId, clientId, taskDescription, 8)
  if (memories.length === 0) return { contextBlock: '', usedIds: [] }

  const lines = memories.map(m => {
    const tags = (() => { try { return (JSON.parse(m.domain_tags) as string[]).join(', ') } catch { return '' } })()
    const level = m.skill_level ? ` [${m.skill_level}]` : ''
    return `- ${m.content}${tags ? ` (${tags})` : ''}${level}`
  })

  return {
    contextBlock: `\n\n## Relevant Past Learnings\n${lines.join('\n')}`,
    usedIds: memories.map(m => m.id),
  }
}

// ─── Learning extraction (post-task) ─────────────────────────────────────────

async function extractLearnings(
  agentId: string,
  clientId: string | null,
  taskTitle: string,
  agentName: string,
  activityLog: string,
  taskOutput: string
): Promise<void> {
  const preview = taskOutput.slice(0, 2000)
  const logPreview = activityLog.slice(0, 1500)

  const extractPrompt = `You analyzed a completed task. Extract 3-5 concise, reusable learnings as a JSON array.

Task: ${taskTitle}
Agent: ${agentName}
Activity log excerpt:
${logPreview}

Output excerpt:
${preview}

Return ONLY a valid JSON array. Each element must have:
- "content": string (1-2 sentence learning, written as a reusable fact or pattern)
- "domain_tags": string[] (1-3 domain tags like ["typescript", "api", "testing"])
- "skill_tags": string[] (1-2 skill tags like ["error-handling", "optimization"])

Example: [{"content":"SQLite WAL mode required for concurrent reads in Electron","domain_tags":["sqlite","electron"],"skill_tags":["performance"]}]`

  try {
    const result = await runWithRouter(
      'You are a knowledge extraction specialist. Output only valid JSON arrays, no markdown.',
      extractPrompt,
      { maxTokens: 1024 }
    )

    const raw = result.content.trim().replace(/^```json?\s*/i, '').replace(/\s*```$/, '')
    const learnings = JSON.parse(raw) as Array<{
      content: string
      domain_tags: string[]
      skill_tags: string[]
    }>

    for (const l of learnings) {
      if (!l.content || typeof l.content !== 'string') continue
      createMemory({
        agent_id: agentId,
        client_id: clientId,
        content: l.content,
        domain_tags: JSON.stringify(Array.isArray(l.domain_tags) ? l.domain_tags : []),
        skill_tags: JSON.stringify(Array.isArray(l.skill_tags) ? l.skill_tags : []),
        relevance_score: 1.0,
        source: 'task',
      })
    }
  } catch {
    // Learning extraction is best-effort — never fail the task over it
  }
}

// ─── MEMORY.md auto-sync with consolidation (post-extraction) ────────────────

// Threshold: once the agent has accumulated enough memories, use AI to consolidate
// and deduplicate rather than just listing them. Keeps MEMORY.md concise.
const CONSOLIDATION_THRESHOLD = 15

async function syncMemoryFile(agentId: string): Promise<void> {
  const memories = getMemories(agentId, { clientId: null, limit: 50 })
  if (memories.length === 0) return

  const formatLine = (m: { content: string; domain_tags: string; skill_level: string | null }, i: number): string => {
    const tags = (() => { try { return (JSON.parse(m.domain_tags) as string[]).join(', ') } catch { return '' } })()
    const level = m.skill_level ? ` [${m.skill_level}]` : ''
    return `${i + 1}. ${m.content}${tags ? ` _(${tags})_` : ''}${level}`
  }

  if (memories.length < CONSOLIDATION_THRESHOLD) {
    // Small count — direct listing, no AI cost
    const content = `# Memory — Accumulated Learnings\n_Auto-synced ${new Date().toISOString().slice(0, 10)}_\n\n${memories.map(formatLine).join('\n')}`
    saveAgentFile(agentId, 'MEMORY.md', content)
    return
  }

  // Enough memories to benefit from consolidation — use AI to deduplicate and merge
  const rawList = memories.map(formatLine).join('\n')
  const consolidatePrompt = `You are maintaining an agent's long-term memory file. The agent has accumulated ${memories.length} memories. Consolidate, deduplicate, and refine them into a clean, non-redundant summary.

Current memories:
${rawList}

Rules:
- Merge overlapping or redundant facts into single clear statements
- Remove anything too task-specific, ephemeral, or superseded by newer entries
- Keep 8–15 key facts maximum — quality and density over quantity
- Format as a numbered list: "N. <fact> _(domain-tag)_ [skill-level]" (omit tags/level if not relevant)
- Return ONLY the numbered list — no heading, no preamble, no explanation`

  try {
    const result = await runWithRouter(
      'You are a knowledge consolidation specialist. Produce concise, non-redundant memory summaries.',
      consolidatePrompt,
      { maxTokens: 1024 }
    )
    const body = result.content.trim()
    if (!body) return
    const content = `# Memory — Accumulated Learnings\n_Consolidated ${new Date().toISOString().slice(0, 10)} · ${memories.length} memories → distilled_\n\n${body}`
    saveAgentFile(agentId, 'MEMORY.md', content)
  } catch {
    // Fall back to direct listing if consolidation fails
    const content = `# Memory — Accumulated Learnings\n_Auto-synced ${new Date().toISOString().slice(0, 10)}_\n\n${memories.map(formatLine).join('\n')}`
    saveAgentFile(agentId, 'MEMORY.md', content)
  }
}

// ─── Cross-agent identity broadcast ──────────────────────────────────────────

function broadcastClientIdentity(sourceAgentId: string, clientId: string, content: string): void {
  const agents = getAllAgents()
  const filename = `IDENTITY-${clientId}.md`
  for (const agent of agents) {
    if (agent.id === sourceAgentId) continue
    saveAgentFile(agent.id, filename, content)
  }
}

// ─── HEARTBEAT.md update (post-task) ─────────────────────────────────────────

function updateHeartbeat(agentId: string, agentName: string, taskTitle: string): void {
  const db = getDb()
  const count = (db.prepare(
    `SELECT COUNT(*) as c FROM tasks WHERE agent_id = ? AND status = 'complete'`
  ).get(agentId) as { c: number }).c

  const now = new Date().toISOString()
  const content = [
    `# Heartbeat — ${agentName}`,
    `Last active: ${now.slice(0, 16).replace('T', ' ')} UTC`,
    `Last task: ${taskTitle}`,
    `Tasks completed: ${count}`,
  ].join('\n')

  saveAgentFile(agentId, 'HEARTBEAT.md', content)
}

// ─── Identity file auto-update (post-task) ────────────────────────────────────

async function updateAgentIdentity(
  agentId: string,
  clientId: string | null,
  taskTitle: string,
  taskOutput: string
): Promise<void> {
  // Use client-scoped identity file when clientId set; fall back to global baseline
  const identityFilename = clientId ? `IDENTITY-${clientId}.md` : 'IDENTITY.md'
  const current = getAgentFile(agentId, identityFilename)
    ?? (clientId ? getAgentFile(agentId, 'IDENTITY.md') : null)
  const currentContent = current?.content?.trim() ?? ''
  const outputPreview = taskOutput.slice(0, 2000)

  const updatePrompt = `You just completed a task. Review the output and update the agent's IDENTITY.md if you discovered anything about the project's structure, tech stack, architecture, or conventions that isn't already captured.

Current IDENTITY.md:
${currentContent || '(empty)'}

Task: ${taskTitle}${clientId ? `\nClient ID: ${clientId}` : ''}

Task output excerpt:
${outputPreview}

Rules:
- Only add information that is genuinely new and not already in the current IDENTITY.md.
- Keep it concise and factual — tech stack, framework versions, file structure conventions, naming patterns, architectural rules.
- Do NOT include task-specific details, opinions, or anything that won't still be true next time.
- If there is nothing new to add, respond with exactly: UNCHANGED
- If there IS new information, respond with the complete updated IDENTITY.md content (not a diff).`

  try {
    const result = await runWithRouter(
      'You are a project context specialist. Extract factual, reusable project structure and stack information only.',
      updatePrompt,
      { maxTokens: 512 }
    )

    const updated = result.content.trim()
    if (updated === 'UNCHANGED' || updated.length === 0) return
    saveAgentFile(agentId, identityFilename, updated)

    // Broadcast client identity to all other agents so they share the same context
    if (clientId) {
      broadcastClientIdentity(agentId, clientId, updated)
    }
  } catch {
    // Best-effort — never fail the task over identity updates
  }
}

// ─── Token estimation ─────────────────────────────────────────────────────────

export function estimateTaskTokens(agentId: string | null, taskTitle: string, taskDescription: string | null): {
  systemTokens: number
  memoryTokens: number
  taskTokens: number
  outputBudget: number
  total: number
} {
  const agent = agentId ? getAgentById(agentId) : null
  const systemText = agent?.system_directive ?? 'You are an autonomous AI agent.'
  const taskText = `Task: ${taskTitle}\n${taskDescription ?? ''}`

  // Rough token estimate: characters / 4
  const systemTokens = Math.ceil(systemText.length / 4)
  const memoryTokens = 200  // rough average for injected memories
  const taskTokens = Math.ceil(taskText.length / 4)
  const outputBudget = 4096

  return {
    systemTokens,
    memoryTokens,
    taskTokens,
    outputBudget,
    total: systemTokens + memoryTokens + taskTokens + outputBudget,
  }
}

// ─── Task runner ──────────────────────────────────────────────────────────────

export async function runTask(
  taskId: string,
  onLog: LogCallback,
  onProgress: ProgressCallback
): Promise<{ content: string }> {
  const task = getTaskById(taskId)
  if (!task) throw new Error(`Task ${taskId} not found`)

  const agent = task.agent_id ? getAgentById(task.agent_id) : null

  // Mark active
  updateTaskStatus(taskId, 'active')
  onProgress(5)

  // Build base system prompt with memory context injected
  const baseDirective = agent?.system_directive
    ? [agent.system_directive, '', 'You are an autonomous AI agent. Execute tasks step by step.', 'Format progress with [Step N] markers. Summarize at the end.'].join('\n')
    : 'You are an autonomous AI agent. Execute tasks step by step. Format progress with [Step N] markers.'

  const taskDescription = [task.title, task.description].filter(Boolean).join(' ')
  const agentFilesBlock = buildAgentFilesBlock(task.agent_id ?? 'agent-lyra', task.client_id ?? null)
  const { contextBlock, usedIds } = buildMemoryContext(
    task.agent_id ?? 'agent-lyra',
    task.client_id ?? null,
    taskDescription
  )

  const systemPrompt = baseDirective + agentFilesBlock + contextBlock

  const userPrompt = [
    `Task: ${task.title}`,
    task.description ? `Description: ${task.description}` : '',
    '',
    'Execute this task step by step. Log each meaningful step clearly.'
  ]
    .filter(Boolean)
    .join('\n')

  onLog(`Starting task: ${task.title}`)
  if (agent) onLog(`Agent: ${agent.name}`)
  if (agentFilesBlock) onLog(`Injecting agent memory & skill files`)
  if (usedIds.length > 0) onLog(`Injecting ${usedIds.length} relevant memories`)
  onProgress(10)

  let buffer = ''
  let lineCount = 0
  const activityLines: string[] = []

  const result = await routeRequest({
    systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
    agentId: task.agent_id ?? undefined,
    cacheSystem: true, // cache the system prompt + memories block
    onChunk: (chunk) => {
      buffer += chunk
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        if (line.trim()) {
          onLog(line)
          activityLines.push(line)
          lineCount++
          onProgress(Math.min(10 + lineCount * 3, 90))
        }
      }
    }
  })

  if (buffer.trim()) {
    onLog(buffer)
    activityLines.push(buffer)
  }

  onProgress(95)

  // Mark memories as used
  if (usedIds.length > 0) markMemoriesUsed(usedIds)

  // Record API usage (model comes from the router — reflects actual provider/model used)
  const db = getDb()
  db.prepare(
    `INSERT INTO api_usage (id, model, input_tokens, output_tokens, cost_usd, task_id, agent_id, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    uuidv4(),
    result.model,
    result.inputTokens,
    result.outputTokens,
    result.costUsd,
    taskId,
    task.agent_id || null,
    new Date().toISOString()
  )

  updateTaskStatus(taskId, 'complete', 100)
  onLog(`✓ Task complete. Tokens used: ${result.inputTokens + result.outputTokens} | Cost: $${result.costUsd.toFixed(6)}`)
  onProgress(100)

  // Post-task: extract learnings → sync MEMORY.md, auto-update IDENTITY.md, update heartbeat
  if (task.agent_id && result.content) {
    // Extract learnings, then sync MEMORY.md once new entries are in the DB
    extractLearnings(
      task.agent_id,
      task.client_id ?? null,
      task.title,
      agent?.name ?? 'Agent',
      activityLines.join('\n'),
      result.content
    ).then(() => syncMemoryFile(task.agent_id!)).catch(() => {})

    updateAgentIdentity(
      task.agent_id,
      task.client_id ?? null,
      task.title,
      result.content
    ).catch(() => {})

    // Heartbeat is synchronous — no AI needed, just a quick write
    if (agent) updateHeartbeat(task.agent_id, agent.name, task.title)
  }

  return { content: result.content }
}
