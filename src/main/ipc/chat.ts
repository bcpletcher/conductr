import { ipcMain, BrowserWindow, app } from 'electron'
import { spawn } from 'child_process'
import path from 'path'
import { mkdirSync, writeFileSync } from 'fs'
import { getMessages, addMessage, clearMessages, toggleBookmark } from '../db/messages'
import { getAgentById } from '../db/agents'
import { getTaskCounts, getTasksByStatus } from '../db/tasks'
import { getAgentFiles } from '../db/agentFiles'
import { getSetting } from '../db/settings'
import { routeRequest } from '../../api/router'
import type { ChatMessage, ContentPart } from '../../api/providers/types'

/**
 * Stream a chat message through the Claude Code CLI.
 * Used when conductor_mode = 'claude-code' (no API key required).
 */
async function streamChatViaCLI(
  agentId: string,
  agentDir: string,
  systemPrompt: string,
  userPrompt: string,
  win: BrowserWindow
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Extend PATH to include common user-local bin dirs that Electron may not inherit
    const extraPaths = [
      process.env.PATH ?? '',
      '/usr/local/bin',
      '/opt/homebrew/bin',
      `${process.env.HOME ?? ''}/.local/bin`,
      `${process.env.HOME ?? ''}/.npm-global/bin`,
    ].filter(Boolean).join(':')

    // ── CLAUDE.md system prompt ───────────────────────────────────────────────
    // Write the agent's chat-mode prompt to CLAUDE.md so the CLI picks it up
    // automatically from cwd.  This also overwrites any stale COMMAND MODE
    // directive that would cause autonomous tool execution.
    try {
      writeFileSync(path.join(agentDir, 'CLAUDE.md'), systemPrompt, 'utf8')
    } catch { /* non-fatal */ }

    // ── Spawn env ─────────────────────────────────────────────────────────────
    // Remove empty ANTHROPIC_API_KEY — an empty string causes the CLI to attempt
    // API-key auth (blocking) instead of falling back to ~/.claude.json OAuth.
    const spawnEnv: NodeJS.ProcessEnv = { ...process.env, PATH: extraPaths }
    if (!spawnEnv.ANTHROPIC_API_KEY) delete spawnEnv.ANTHROPIC_API_KEY

    // ── Spawn ─────────────────────────────────────────────────────────────────
    // stdio: ['ignore', 'pipe', 'pipe'] is the critical fix:
    // Without it, the process blocks forever waiting for stdin — either the CLI
    // itself (for login) or the OMC plugin hooks (SessionStart:startup) try to
    // read from stdin.  'ignore' sends immediate EOF so they exit cleanly.
    const proc = spawn('claude', [
      '--output-format', 'stream-json',
      '--verbose',
      '--no-session-persistence',
      '-p', userPrompt,
    ], {
      cwd: agentDir,
      env: spawnEnv,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let finalContent = ''
    let chunkBuffer  = ''  // fallback: accumulate every streamed text chunk
    let lineBuffer   = ''
    const stderrLines: string[] = []
    let rejected     = false

    // ── Hard timeout — prevents infinite spinner if CLI hangs ────────────────
    const timeout = setTimeout(() => {
      if (rejected) return
      rejected = true
      console.error(`[conductr:chat] TIMEOUT after 45s for agent=${agentId}`)
      try { proc.kill('SIGTERM') } catch { /* ignore */ }
      reject(new Error(
        'Claude CLI timed out (45 s) — verify `claude --version` works in your terminal, ' +
        'then restart the app'
      ))
    }, 45_000)

    function processLine(line: string): void {
      if (!line.trim()) return
      try {
        const event = JSON.parse(line) as {
          type: string
          message?: { content?: { type: string; text: string }[] }
          result?: string
          subtype?: string
          error?: string
        }
        if (event.type === 'assistant') {
          // Each assistant event may be partial (streaming) or final.
          // De-duplicate: only append the NEW portion beyond what we already have.
          const fullText = (event.message?.content ?? [])
            .filter((b) => b.type === 'text')
            .map((b) => b.text)
            .join('')
          if (fullText) {
            const newPart = fullText.startsWith(chunkBuffer)
              ? fullText.slice(chunkBuffer.length)   // streaming delta
              : fullText                              // standalone (non-partial) event
            if (newPart) {
              win.webContents.send('chat:chunk', { agentId, chunk: newPart })
              chunkBuffer = fullText   // track cumulative text
            }
          }
        } else if (event.type === 'result') {
          if (event.result) finalContent = event.result
          if (event.subtype === 'error' && event.error && !rejected) {
            rejected = true
            clearTimeout(timeout)
            reject(new Error(event.error))
          }
        }
      } catch { /* non-JSON line — ignore */ }
    }

    proc.stdout.on('data', (data: Buffer) => {
      const text = data.toString()
      console.error(`[conductr:chat][stdout] ${text.slice(0, 120).replace(/\n/g, '↵')}`)
      lineBuffer += text
      const lines = lineBuffer.split('\n')
      lineBuffer = lines.pop() ?? ''
      for (const line of lines) processLine(line)
    })

    proc.stderr.on('data', (data: Buffer) => {
      const text = data.toString()
      stderrLines.push(text.trim())
      console.error(`[conductr:chat][stderr] ${text.trim()}`)
      // Auto-respond to planning mode / tool confirmation prompts on stderr
      if (/\?\s*$|y\/n|\[yes\/no\]|proceed|confirm|approve/i.test(text)) {
        try { proc.stdin?.write('yes\n') } catch { /* ignore */ }
      }
    })

    proc.on('error', (err) => {
      clearTimeout(timeout)
      if (rejected) return
      rejected = true
      const msg = err.message.includes('ENOENT')
        ? 'Claude Code CLI not found — install with: npm install -g @anthropic-ai/claude-code'
        : err.message
      console.error(`[conductr:chat][proc error] ${msg}`)
      reject(new Error(msg))
    })

    proc.on('close', (code) => {
      clearTimeout(timeout)
      if (rejected) return
      if (lineBuffer.trim()) processLine(lineBuffer)
      // Prefer the result event's canonical text; fall back to accumulated streaming chunks
      const content = finalContent.trim() || chunkBuffer.trim()
      console.error(`[conductr:chat][close] code=${code} | content_len=${content.length} | stderr_lines=${stderrLines.length}`)
      if (!content) {
        const hint = stderrLines.length > 0
          ? ` — ${stderrLines.slice(-3).join('; ')}`
          : ` (exit code ${code})`
        reject(new Error(`No response from Claude Code CLI${hint}`))
      } else {
        resolve(content)
      }
    })
  })
}

const CHAT_FILE_ORDER = ['SOUL.md', 'IDENTITY.md', 'TOOLS.md', 'MEMORY.md']

// Max chars per agent file injected into system prompt (≈2000 tokens each)
const AGENT_FILE_MAX_CHARS = 8000
// Max chars per historical chat message sent as context (≈750 tokens)
const HISTORY_MSG_MAX_CHARS = 3000

export function registerChatHandlers(win: BrowserWindow): void {
  // Get conversation history for an agent
  ipcMain.handle('chat:getMessages', (_e, agentId: string) => {
    return getMessages(agentId)
  })

  // Clear conversation for an agent
  ipcMain.handle('chat:clearMessages', (_e, agentId: string) => {
    clearMessages(agentId)
    return true
  })

  // Toggle bookmark on a message
  ipcMain.handle('chat:toggleBookmark', (_e, messageId: string) => {
    return toggleBookmark(messageId)
  })

  // Send a message and stream the response back
  ipcMain.on('chat:send', async (_e, {
    agentId,
    content,
    images,
    mentionContexts,
  }: {
    agentId: string
    content: string
    images?: { data: string; mediaType: string }[]
    mentionContexts?: { agentName: string; messages: { role: string; content: string }[] }[]
  }) => {
    // Persist user message (text only — images are not stored in DB)
    addMessage(agentId, 'user', content)

    // Build agent system prompt
    const agent = getAgentById(agentId)
    const agentName = agent?.name ?? 'Assistant'

    // Inject live Conductr context so agents are aware of system state
    const counts = getTaskCounts()
    const activeTasks = getTasksByStatus('active').slice(0, 3)
    const recentComplete = getTasksByStatus('complete').slice(0, 3)

    const liveContext = [
      '## Conductr Live Context',
      `Active tasks: ${counts.active} | Queued: ${counts.queued} | Completed: ${counts.complete} | Failed: ${counts.failed}`,
      activeTasks.length > 0
        ? `Currently running: ${activeTasks.map((t) => `"${t.title}"`).join(', ')}`
        : 'No tasks currently running.',
      recentComplete.length > 0
        ? `Recently completed: ${recentComplete.map((t) => `"${t.title}"`).join(', ')}`
        : 'No completed tasks yet.',
    ].join('\n')

    // Load agent's core files (SOUL, IDENTITY, TOOLS, MEMORY) and inject as context
    // Each file is capped at AGENT_FILE_MAX_CHARS to prevent system prompt bloat
    const coreFiles = getAgentFiles(agentId)
      .filter(f => CHAT_FILE_ORDER.includes(f.filename) && f.content.trim().length > 0)
      .sort((a, b) => CHAT_FILE_ORDER.indexOf(a.filename) - CHAT_FILE_ORDER.indexOf(b.filename))
    const agentFilesBlock = coreFiles.length > 0
      ? '\n\n## Agent Memory & Skills\n_If IDENTITY.md above specifies a project stack or conventions, those take priority. Always follow the target project\'s existing patterns and defer to what IDENTITY.md says._\n\n' + coreFiles.map(f => {
          const body = f.content.trim()
          const truncated = body.length > AGENT_FILE_MAX_CHARS
            ? body.slice(0, AGENT_FILE_MAX_CHARS) + '\n…[truncated]'
            : body
          return `### ${f.filename}\n${truncated}`
        }).join('\n\n')
      : ''

    const systemPrompt = [
      agent?.system_directive ?? `You are ${agentName}, a helpful AI assistant.`,
      agentFilesBlock,
      '',
      `Your name is ${agentName}. Stay in character. Be helpful, direct, and concise.`,
      'You are aware of the Conductr platform — an AI operations layer where agents manage tasks, documents, and workflows.',
      'When the user asks to "queue a task", "create a task", or similar, acknowledge you can help and ask for details if needed.',
      '',
      liveContext,
    ].join('\n')

    // Build mention context block if @-mentions were detected
    const mentionBlock = mentionContexts && mentionContexts.length > 0
      ? [
          '## Mentioned Agent Context',
          ...mentionContexts.map(({ agentName, messages }) => {
            const preview = messages
              .slice(-6)
              .map((m) => `${m.role === 'user' ? 'User' : agentName}: ${m.content.slice(0, 300)}`)
              .join('\n')
            return `### ${agentName}'s recent conversation:\n${preview}`
          }),
        ].join('\n')
      : null

    const fullSystemPrompt = mentionBlock
      ? [systemPrompt, '', mentionBlock].join('\n')
      : systemPrompt

    // Build message history — depth from settings (default 40), messages truncated to HISTORY_MSG_MAX_CHARS
    const historyDepthSetting = parseInt(getSetting('context_history_depth') ?? '', 10)
    const historyDepth = !isNaN(historyDepthSetting) && historyDepthSetting > 0 ? historyDepthSetting : 40
    const history = getMessages(agentId)
    const historySlice = history.slice(-historyDepth)

    // All turns before the current one — truncate long messages to keep input tokens manageable
    const priorMessages: ChatMessage[] = historySlice
      .slice(0, -1)
      .map((m) => {
        const body = typeof m.content === 'string' ? m.content : String(m.content)
        const truncated = body.length > HISTORY_MSG_MAX_CHARS
          ? body.slice(0, HISTORY_MSG_MAX_CHARS) + '\n…[truncated]'
          : body
        return { role: m.role as 'user' | 'assistant', content: truncated }
      })

    // Current user message: multimodal if images attached, plain text otherwise
    let currentUserContent: string | ContentPart[]
    if (images && images.length > 0) {
      currentUserContent = [
        ...images.map((img): ContentPart => ({
          type: 'image',
          imageData: { base64: img.data, mediaType: img.mediaType },
        })),
        { type: 'text', text: content },
      ]
    } else {
      currentUserContent = content
    }

    const routeMessages: ChatMessage[] = [
      ...priorMessages,
      { role: 'user', content: currentUserContent },
    ]

    // ── Claude Code mode: route through CLI instead of API ───────────────────
    const conductorMode = getSetting('conductor_mode') ?? 'claude-code'
    if (conductorMode === 'claude-code') {
      const agentDir = path.join(app.getPath('home'), '.conductr', 'agents', agentId)
      try { mkdirSync(agentDir, { recursive: true }) } catch { /* already exists */ }

      // Short chat-mode system prompt for CLI — no COMMAND MODE / agent files.
      // The full directive triggers autonomous tool execution; keep this to identity + context only.
      const roleOneLiner = agent?.operational_role?.split('\n')[0] ?? 'helpful AI assistant'
      const cliSystemPrompt = [
        `You are ${agentName}, ${roleOneLiner}.`,
        'You are in chat mode. Respond conversationally — be helpful, direct, and concise.',
        'Do not autonomously execute tools or tasks unless the user explicitly asks you to.',
        '',
        liveContext,
      ].join('\n')

      // Build contextual prompt — include recent message history so CLI maintains coherence
      const allMessages  = getMessages(agentId)
      const contextMsgs  = allMessages.slice(-9, -1)   // last 8 prior turns (excl. current)
      let cliPrompt = content
      if (contextMsgs.length > 0) {
        const ctxStr = contextMsgs
          .map((m) => `**${m.role === 'user' ? 'User' : agentName}:** ${String(m.content).slice(0, 400)}`)
          .join('\n\n')
        cliPrompt = `[Conversation so far:]\n${ctxStr}\n\n[Current message:]\n${content}`
      }

      try {
        const result = await streamChatViaCLI(agentId, agentDir, cliSystemPrompt, cliPrompt, win)
        const assistantMsg = addMessage(agentId, 'assistant', result)
        win.webContents.send('chat:done', { agentId, message: assistantMsg })
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err)
        win.webContents.send('chat:error', { agentId, error })
      }
      return
    }

    // Load MCP tools assigned to this agent
    let mcpTools: import('../../api/providers/types').RouteOptions['tools'] = undefined
    try {
      const db = (await import('../db/schema')).getDb()
      const serverRows = db
        .prepare('SELECT server_id FROM agent_mcp_servers WHERE agent_id = ?')
        .all(agentId) as { server_id: string }[]
      if (serverRows.length > 0) {
        const serverIds = serverRows.map((r) => r.server_id)
        const { getToolsForServers, toAnthropicTools } = await import('../../main/mcp/manager')
        const tools = await getToolsForServers(serverIds)
        if (tools.length > 0) mcpTools = toAnthropicTools(tools)
      }
    } catch {
      // MCP tools optional — don't block chat on errors
    }

    try {
      const result = await routeRequest({
        systemPrompt: fullSystemPrompt,
        messages: routeMessages,
        agentId,
        tools: mcpTools,
        onChunk: (chunk) => {
          win.webContents.send('chat:chunk', { agentId, chunk })
        },
        onToolCall: (toolName, args) => {
          win.webContents.send('chat:tool-call', { agentId, toolName, args })
        },
        onToolResult: (toolName, result, isError) => {
          win.webContents.send('chat:tool-result', { agentId, toolName, result: result.slice(0, 500), isError })
        },
      })

      // Persist and return final assistant message
      const assistantMsg = addMessage(agentId, 'assistant', result.content)
      win.webContents.send('chat:done', { agentId, message: assistantMsg })
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      win.webContents.send('chat:error', { agentId, error })
    }
  })
}
