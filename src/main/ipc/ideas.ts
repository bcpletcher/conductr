import { ipcMain, BrowserWindow } from 'electron'
import fs from 'fs'
import path from 'path'
import {
  getIdeas,
  createIdea,
  updateIdeaStatus,
  deleteIdea,
  getPendingCount,
  type DbIdea,
} from '../db/ideas'
import { getTasksByStatus, getTaskCounts } from '../db/tasks'
import { getKnowledge, getMemories } from '../db/memories'
import { runWithRouter } from '../../api/router'

// Path to docs folder (relative to app root — works in both dev and prod)
function getDocsPath(filename: string): string {
  // In dev: __dirname is src/main/ipc, so go up 3 levels to root
  // In packaged: resources/app/src/main/ipc → up to resources/app
  const candidates = [
    path.resolve(__dirname, '../../../docs', filename),
    path.resolve(__dirname, '../../../../docs', filename),
    path.resolve(process.resourcesPath ?? '', 'docs', filename),
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  return path.resolve(__dirname, '../../../docs', filename)
}

function readDoc(filename: string): string {
  try { return fs.readFileSync(getDocsPath(filename), 'utf-8') }
  catch { return '' }
}

// Build the analysis prompt for Lyra
function buildGenerationPrompt(existingTitles: string[]): string {
  const roadmap = readDoc('roadmap.md')
  const architecture = readDoc('architecture.md')

  const counts = getTaskCounts()
  const recentComplete = getTasksByStatus('complete').slice(0, 10)

  const recentSummary = recentComplete.length > 0
    ? recentComplete.map((t) => `- ${t.title}`).join('\n')
    : 'No completed tasks yet.'

  const existingList = existingTitles.length > 0
    ? `\n\nAlready proposed (do NOT re-propose these):\n${existingTitles.map((t) => `- ${t}`).join('\n')}`
    : ''

  // Inject Lyra's knowledge base + recent memories for richer context
  const knowledgeEntries = getKnowledge({ limit: 20 })
  const lyraMemories = getMemories('agent-lyra', { limit: 12 })

  const knowledgeBlock = knowledgeEntries.length > 0
    ? `\n\n## Knowledge Base (${knowledgeEntries.length} entries)\n${knowledgeEntries.map((k) => `- **${k.title}**: ${k.content.slice(0, 200)}`).join('\n')}`
    : ''

  const memoriesBlock = lyraMemories.length > 0
    ? `\n\n## Lyra's Past Learnings\n${lyraMemories.map((m) => `- ${m.content}`).join('\n')}`
    : ''

  return `You are Lyra, lead orchestrator of the Conductr AI operations platform. You are analyzing the app you run inside — studying the roadmap, architecture, and usage patterns to identify the most impactful improvements.

## Current App Context
Task stats: ${counts.queued} queued · ${counts.active} active · ${counts.complete} completed · ${counts.failed} failed

Recent completed tasks:
${recentSummary}

## Roadmap (current state)
${roadmap.slice(0, 6000)}

## Architecture
${architecture.slice(0, 3000)}${knowledgeBlock}${memoriesBlock}
${existingList}

## Your Task
Generate exactly 5 specific, actionable improvement proposals for Conductr. These should be concrete enhancements a developer could implement — not vague suggestions. Prioritize proposals that:
1. Fill gaps in completed phases (quick wins with high impact)
2. Improve the daily user experience
3. Reduce friction in the most-used workflows (Chat, Workshop, Dashboard)
4. Improve agent effectiveness
5. Are achievable without depending on unbuilt phases

Respond with a JSON array only — no markdown, no preamble. Format:
[
  {
    "title": "Short actionable title (max 60 chars)",
    "what": "What this feature does, in 1-2 sentences",
    "why": "Why it matters — the benefit to the user",
    "risks": "Potential downsides or implementation complexity",
    "effort": "S",
    "phase": "Phase 8"
  }
]

effort must be one of: S (< 1 day), M (1-3 days), L (3-7 days), XL (1+ week)
phase should reference the most relevant existing phase number, or "New" for a new phase.
Return only valid JSON. No other text.`
}

export function generateIdeas(win: BrowserWindow): void {
  const existing = getIdeas()
  const existingTitles = existing.map((i) => i.title)
  const prompt = buildGenerationPrompt(existingTitles)

  setImmediate(async () => {
    try {
      win.webContents.send('ideas:generating', { status: 'thinking' })

      const result = await runWithRouter(
        'You are Lyra, AI product strategist for Conductr. Analyze the platform and generate improvement proposals in the requested JSON format.',
        prompt,
        {
          maxTokens: 2048,
          onChunk: (chunk) => win.webContents.send('ideas:chunk', { chunk }),
        }
      )
      const rawContent = result.content

      // Parse the JSON response
      const jsonMatch = rawContent.match(/\[[\s\S]*\]/)
      if (!jsonMatch) throw new Error('No JSON array found in response')

      const proposals = JSON.parse(jsonMatch[0]) as Array<{
        title: string
        what?: string
        why?: string
        risks?: string
        effort?: string
        phase?: string
      }>

      const created: DbIdea[] = []
      for (const p of proposals) {
        if (!p.title) continue
        // Skip duplicates by title (case-insensitive)
        const isDuplicate = existing.some(
          (e) => e.title.toLowerCase() === p.title.toLowerCase()
        )
        if (isDuplicate) continue
        const idea = createIdea({
          title: p.title,
          what: p.what ?? null,
          why: p.why ?? null,
          risks: p.risks ?? null,
          effort: p.effort ?? null,
          phase: p.phase ?? null,
          source_agent: 'Lyra',
        })
        created.push(idea)
      }

      win.webContents.send('ideas:done', { count: created.length, ideas: created })
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      win.webContents.send('ideas:error', { error })
    }
  })
}

export function registerIdeasHandlers(win: BrowserWindow): void {
  ipcMain.handle('ideas:getAll', (_e, status?: string) => {
    return getIdeas(status)
  })

  ipcMain.handle('ideas:getPendingCount', () => {
    return getPendingCount()
  })

  ipcMain.handle('ideas:approve', (_e, id: string, taskId?: string) => {
    return updateIdeaStatus(id, 'approved', { taskId })
  })

  ipcMain.handle('ideas:deny', (_e, id: string, reason: string) => {
    return updateIdeaStatus(id, 'denied', { denyReason: reason })
  })

  ipcMain.handle('ideas:pin', (_e, id: string) => {
    const idea = getIdeas().find((i) => i.id === id)
    if (!idea) return null
    const newStatus = idea.status === 'pinned' ? 'pending' : 'pinned'
    return updateIdeaStatus(id, newStatus as 'pending' | 'pinned')
  })

  ipcMain.handle('ideas:delete', (_e, id: string) => {
    deleteIdea(id)
    return true
  })

  // Start generation (streaming — events sent back via webContents)
  ipcMain.on('ideas:generate', () => {
    generateIdeas(win)
  })
}
