import Anthropic from '@anthropic-ai/sdk'
import { getSecureSetting } from '../main/db/settings'

let client: Anthropic | null = null

export function getAnthropicClient(): Anthropic {
  if (!client) {
    // Prefer environment variable; fall back to key stored via Settings page
    const apiKey = process.env.ANTHROPIC_API_KEY || getSecureSetting('anthropic_api_key')
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set. Add it to your .env file or configure it in Settings.')
    }
    client = new Anthropic({ apiKey })
  }
  return client
}

/** Call after saving a new API key via settings so the next request picks it up */
export function resetAnthropicClient(): void {
  client = null
}

export interface RunClaudeOptions {
  systemPrompt: string
  userPrompt: string
  model?: string
  maxTokens?: number
  onChunk?: (text: string) => void
  /** Wrap system prompt in cache_control ephemeral block to save tokens on repeated calls */
  cacheSystem?: boolean
}

export interface ClaudeResult {
  content: string
  inputTokens: number
  outputTokens: number
  costUsd: number
}

// Approximate cost per 1M tokens (claude-sonnet-4-6 pricing)
const COST_PER_1M_INPUT = 3.0
const COST_PER_1M_OUTPUT = 15.0

export async function runClaude({
  systemPrompt,
  userPrompt,
  model = 'claude-sonnet-4-6',
  maxTokens = 4096,
  onChunk,
  cacheSystem = false,
}: RunClaudeOptions): Promise<ClaudeResult> {
  const anthropic = getAnthropicClient()
  let fullContent = ''

  // Use cache_control on the system prompt when requested (saves ~90% on repeated calls)
  const systemBlock = cacheSystem
    ? [{ type: 'text' as const, text: systemPrompt, cache_control: { type: 'ephemeral' as const } }]
    : systemPrompt

  const stream = anthropic.messages.stream({
    model,
    max_tokens: maxTokens,
    system: systemBlock,
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
