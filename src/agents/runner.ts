import { getTaskById, updateTaskStatus } from '../main/db/tasks'
import { getAgentById } from '../main/db/agents'
import { addActivityLog } from '../main/db/documents'
import { getDb } from '../main/db/schema'
import { runClaude } from '../api/claude'
import { v4 as uuidv4 } from 'uuid'

type LogCallback = (message: string) => void
type ProgressCallback = (progress: number) => void

export async function runTask(
  taskId: string,
  onLog: LogCallback,
  onProgress: ProgressCallback
): Promise<void> {
  const task = getTaskById(taskId)
  if (!task) throw new Error(`Task ${taskId} not found`)

  const agent = task.agent_id ? getAgentById(task.agent_id) : null

  // Mark active
  updateTaskStatus(taskId, 'active')
  onProgress(5)

  const systemPrompt = agent?.system_directive
    ? [
        agent.system_directive,
        '',
        'You are an autonomous AI agent. Execute tasks step by step.',
        'Format progress with [Step N] markers. Summarize at the end.'
      ].join('\n')
    : 'You are an autonomous AI agent. Execute tasks step by step. Format progress with [Step N] markers.'

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
  onProgress(10)

  let buffer = ''
  let lineCount = 0

  const result = await runClaude({
    systemPrompt,
    userPrompt,
    onChunk: (chunk) => {
      buffer += chunk
      // Emit complete lines
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        if (line.trim()) {
          onLog(line)
          lineCount++
          // Rough progress estimate based on lines
          const estimatedProgress = Math.min(10 + lineCount * 3, 90)
          onProgress(estimatedProgress)
        }
      }
    }
  })

  // Emit any remaining buffer
  if (buffer.trim()) {
    onLog(buffer)
  }

  onProgress(95)

  // Record API usage
  const db = getDb()
  db.prepare(
    `INSERT INTO api_usage (id, model, input_tokens, output_tokens, cost_usd, task_id, agent_id, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    uuidv4(),
    'claude-sonnet-4-6',
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
}
