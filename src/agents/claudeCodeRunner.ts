import { spawn } from 'child_process'
import path from 'path'
import { app } from 'electron'
import { getTaskById, updateTaskStatus } from '../main/db/tasks'
import { getAgentById } from '../main/db/agents'
import { addActivityLog } from '../main/db/documents'

type LogCallback = (message: string) => void
type ProgressCallback = (progress: number) => void

// Structured events emitted by `claude --output-format stream-json`
interface ClaudeTextBlock  { type: 'text';  text: string }
interface ClaudeAssistantEvent {
  type: 'assistant'
  message: { content: ClaudeTextBlock[] }
}
interface ClaudeToolUseEvent {
  type: 'tool_use'
  name: string
  input?: Record<string, unknown>
}
interface ClaudeToolResultEvent {
  type: 'tool_result'
  content?: ClaudeTextBlock[] | string
}
interface ClaudeResultEvent {
  type: 'result'
  subtype?: string
  result?: string
  error?: string
}
type ClaudeEvent =
  | ClaudeAssistantEvent
  | ClaudeToolUseEvent
  | ClaudeToolResultEvent
  | ClaudeResultEvent
  | { type: string }

/**
 * Runs a task via the Claude Code CLI subprocess.
 *
 * Uses --output-format stream-json to get structured streaming events:
 *   - assistant  → streamed text chunks
 *   - tool_use   → bash/read/write tool calls (shown as ⚡ Tool: name → arg)
 *   - tool_result → tool output (first 5 lines shown)
 *   - result     → final answer
 *
 * Falls back gracefully if the CLI is not found.
 */
export async function runTaskViaClaude(
  taskId: string,
  onLog: LogCallback,
  onProgress: ProgressCallback
): Promise<{ content: string }> {
  const task = getTaskById(taskId)
  if (!task) throw new Error(`Task ${taskId} not found`)

  const agent   = task.agent_id ? getAgentById(task.agent_id) : null
  const agentId = task.agent_id ?? 'agent-lyra'
  const agentDir = path.join(app.getPath('home'), '.conductr', 'agents', agentId)

  updateTaskStatus(taskId, 'active')
  onProgress(5)

  const prompt = [
    `Task: ${task.title}`,
    task.description ? `\nDescription: ${task.description}` : '',
    '\n\nExecute this task step by step. Log each meaningful step clearly.',
  ]
    .filter(Boolean)
    .join('')

  onLog(`Starting task via Claude Code: ${task.title}`)
  if (agent) onLog(`Agent: ${agent.name} · project dir: ${agentDir}`)
  onProgress(10)

  return new Promise((resolve, reject) => {
    const proc = spawn('claude', [
      '--output-format', 'stream-json',
      '--verbose',
      '-p', prompt,
    ], {
      cwd: agentDir,
      env: { ...process.env },
    })

    let finalContent = ''
    let lineCount    = 0
    let lineBuffer   = ''

    function processLine(line: string): void {
      if (!line.trim()) return
      lineCount++
      onProgress(Math.min(10 + lineCount * 2, 88))

      // Try to parse as structured JSON event
      try {
        const event = JSON.parse(line) as ClaudeEvent

        switch (event.type) {
          case 'assistant': {
            const e = event as ClaudeAssistantEvent
            for (const block of (e.message?.content ?? [])) {
              if (block.type === 'text' && block.text) {
                finalContent += block.text
                // Surface non-empty lines as log messages
                const textLines = block.text.split('\n')
                for (const tl of textLines) {
                  if (tl.trim()) onLog(tl)
                }
              }
            }
            break
          }
          case 'tool_use': {
            const e = event as ClaudeToolUseEvent
            const arg = e.input?.command
              ?? e.input?.path
              ?? (Object.values(e.input ?? {})[0] as string | undefined)
              ?? ''
            onLog(`⚡ Tool: ${e.name}${arg ? ` → ${String(arg).slice(0, 80)}` : ''}`)
            break
          }
          case 'tool_result': {
            const e = event as ClaudeToolResultEvent
            let text = ''
            if (Array.isArray(e.content)) {
              text = (e.content as ClaudeTextBlock[])
                .filter(c => c.type === 'text')
                .map(c => c.text)
                .join('')
            } else if (typeof e.content === 'string') {
              text = e.content
            }
            if (text.trim()) {
              const preview = text.split('\n').slice(0, 5).join('\n  ')
              onLog(`  ${preview}`)
            }
            break
          }
          case 'result': {
            const e = event as ClaudeResultEvent
            if (e.result) finalContent = e.result
            if (e.subtype === 'error' && e.error) {
              onLog(`✗ ${e.error}`)
            }
            break
          }
          // system / other events: silently skip
        }
      } catch {
        // Not a JSON line — log as plain text
        onLog(line)
      }
    }

    proc.stdout.on('data', (data: Buffer) => {
      // Buffer partial lines across data chunks
      lineBuffer += data.toString()
      const lines = lineBuffer.split('\n')
      lineBuffer = lines.pop() ?? ''
      for (const line of lines) processLine(line)
    })

    proc.stderr.on('data', (data: Buffer) => {
      const text = data.toString().trim()
      if (text) onLog(`[stderr] ${text}`)
    })

    proc.on('error', (err) => {
      const msg = err.message.includes('ENOENT')
        ? 'Claude Code CLI not found — install it with: npm install -g @anthropic-ai/claude-code'
        : err.message
      onLog(`✗ ${msg}`)
      updateTaskStatus(taskId, 'failed')
      reject(new Error(msg))
    })

    proc.on('close', (code) => {
      // Flush remaining buffer
      if (lineBuffer.trim()) processLine(lineBuffer)

      onProgress(95)

      if (code !== 0) {
        onLog(`✗ claude exited with code ${code}`)
        updateTaskStatus(taskId, 'failed')
        reject(new Error(`claude exited with code ${code}`))
        return
      }

      updateTaskStatus(taskId, 'complete', 100)
      onLog('✓ Task complete via Claude Code')
      onProgress(100)

      if (task.agent_id) {
        addActivityLog({
          task_id: taskId,
          agent_id: task.agent_id,
          message: `Task completed via Claude Code: ${task.title}`,
        }).catch(() => {})
      }

      resolve({ content: finalContent.trim() || '(no output)' })
    })
  })
}
