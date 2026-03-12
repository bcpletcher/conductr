import Anthropic from '@anthropic-ai/sdk'

let client: Anthropic | null = null

export function getAnthropicClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set. Add it to your .env file.')
    }
    client = new Anthropic({ apiKey })
  }
  return client
}

export interface RunClaudeOptions {
  systemPrompt: string
  userPrompt: string
  model?: string
  maxTokens?: number
  onChunk?: (text: string) => void
}

export interface ClaudeResult {
  content: string
  inputTokens: number
  outputTokens: number
  costUsd: number
}

// Approximate cost per 1M tokens (claude-sonnet-4-5 pricing)
const COST_PER_1M_INPUT = 3.0
const COST_PER_1M_OUTPUT = 15.0

export async function runClaude({
  systemPrompt,
  userPrompt,
  model = 'claude-sonnet-4-5',
  maxTokens = 4096,
  onChunk
}: RunClaudeOptions): Promise<ClaudeResult> {
  const anthropic = getAnthropicClient()
  let fullContent = ''

  const stream = anthropic.messages.stream({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }]
  })

  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      const chunk = event.delta.text
      fullContent += chunk
      if (onChunk) onChunk(chunk)
    }
  }

  const finalMessage = await stream.finalMessage()
  const inputTokens = finalMessage.usage.input_tokens
  const outputTokens = finalMessage.usage.output_tokens
  const costUsd =
    (inputTokens / 1_000_000) * COST_PER_1M_INPUT +
    (outputTokens / 1_000_000) * COST_PER_1M_OUTPUT

  return {
    content: fullContent,
    inputTokens,
    outputTokens,
    costUsd
  }
}
