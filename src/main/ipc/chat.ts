import { ipcMain, BrowserWindow } from 'electron'
import { getMessages, addMessage, clearMessages } from '../db/messages'
import { getAgentById } from '../db/agents'
import { getTaskCounts, getTasksByStatus } from '../db/tasks'
import { getAnthropicClient } from '../../api/claude'

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

  // Send a message and stream the response back
  ipcMain.on('chat:send', async (_e, { agentId, content }: { agentId: string; content: string }) => {
    // Persist user message
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

    const systemPrompt = [
      agent?.system_directive ?? `You are ${agentName}, a helpful AI assistant.`,
      '',
      `Your name is ${agentName}. Stay in character. Be helpful, direct, and concise.`,
      'You are aware of the Conductr platform — an AI operations layer where agents manage tasks, documents, and workflows.',
      'When the user asks to "queue a task", "create a task", or similar, acknowledge you can help and ask for details if needed.',
      '',
      liveContext,
    ].join('\n')

    // Build message history (last 40 turns) for Claude context
    const history = getMessages(agentId)
    const claudeMessages = history
      .slice(-40)
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    let fullContent = ''

    try {
      const anthropic = getAnthropicClient()
      const stream = anthropic.messages.stream({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: systemPrompt,
        messages: claudeMessages
      })

      for await (const ev of stream) {
        if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') {
          fullContent += ev.delta.text
          win.webContents.send('chat:chunk', { agentId, chunk: ev.delta.text })
        }
      }

      // Persist and return final assistant message
      const assistantMsg = addMessage(agentId, 'assistant', fullContent)
      win.webContents.send('chat:done', { agentId, message: assistantMsg })
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      win.webContents.send('chat:error', { agentId, error })
    }
  })
}
