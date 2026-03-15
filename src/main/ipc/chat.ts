import { ipcMain, BrowserWindow } from 'electron'
import { getMessages, addMessage, clearMessages, toggleBookmark } from '../db/messages'
import { getAgentById } from '../db/agents'
import { getTaskCounts, getTasksByStatus } from '../db/tasks'
import { getAgentFiles } from '../db/agentFiles'
import { getSetting } from '../db/settings'
import { routeRequest } from '../../api/router'
import type { ChatMessage, ContentPart } from '../../api/providers/types'

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

    try {
      const result = await routeRequest({
        systemPrompt: fullSystemPrompt,
        messages: routeMessages,
        agentId,
        onChunk: (chunk) => {
          win.webContents.send('chat:chunk', { agentId, chunk })
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
