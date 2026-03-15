/**
 * LLM Router — selects the right provider + model for every request.
 *
 * Priority order:
 *   1. Single-run override (options.provider + options.model)
 *   2. Per-agent default (agents.default_provider + agents.default_model)
 *   3. Global default (settings: default_provider + default_model)
 *   4. Factory default: first available provider key
 */

import { getSetting, getSecureSetting } from '../main/db/settings'
import { getDb } from '../main/db/schema'
import { streamOpenAICompat, testOpenAICompatConnection } from './providers/openai-compat'
import { getCostForModel } from './providers/registry'
import type { ProviderName, RouteOptions, RouteResult } from './providers/types'

/**
 * Check daily and monthly spend against configured budget limits.
 * Throws a user-friendly error if a limit would be exceeded.
 */
function checkBudget(): void {
  try {
    const db = getDb()
    const today = new Date().toISOString().slice(0, 10)   // "YYYY-MM-DD"
    const month = new Date().toISOString().slice(0, 7)    // "YYYY-MM"

    const dailyLimit = parseFloat(getSetting('budget_daily') ?? '')
    const monthlyLimit = parseFloat(getSetting('budget_monthly') ?? '')

    if (!isNaN(dailyLimit) && dailyLimit > 0) {
      const row = db
        .prepare(`SELECT COALESCE(SUM(cost_usd), 0) AS total FROM api_usage WHERE timestamp LIKE ?`)
        .get(`${today}%`) as { total: number }
      if (row.total >= dailyLimit) {
        throw new Error(
          `Daily budget of $${dailyLimit.toFixed(2)} reached ($${row.total.toFixed(4)} spent today). ` +
          `Adjust your limit in Settings → Budget.`
        )
      }
    }

    if (!isNaN(monthlyLimit) && monthlyLimit > 0) {
      const row = db
        .prepare(`SELECT COALESCE(SUM(cost_usd), 0) AS total FROM api_usage WHERE timestamp LIKE ?`)
        .get(`${month}%`) as { total: number }
      if (row.total >= monthlyLimit) {
        throw new Error(
          `Monthly budget of $${monthlyLimit.toFixed(2)} reached ($${row.total.toFixed(4)} spent this month). ` +
          `Adjust your limit in Settings → Budget.`
        )
      }
    }
  } catch (err) {
    // Re-throw budget errors; swallow DB-not-ready errors silently
    if (err instanceof Error && err.message.includes('budget')) throw err
  }
}

// Base URLs for OpenAI-compatible providers
const PROVIDER_URLS: Record<string, string> = {
  openrouter: 'https://openrouter.ai/api/v1',
  openai: 'https://api.openai.com/v1',
  groq: 'https://api.groq.com/openai/v1',
  ollama: 'http://localhost:11434/v1',
}

// Settings keys for each provider's API key
const PROVIDER_KEY_SETTINGS: Record<string, string> = {
  anthropic: 'anthropic_api_key',
  openrouter: 'provider_key_openrouter',
  openai: 'provider_key_openai',
  groq: 'provider_key_groq',
}

function getProviderKey(provider: string): string | null {
  if (provider === 'anthropic') {
    return process.env.ANTHROPIC_API_KEY || getSecureSetting('anthropic_api_key') || null
  }
  if (provider === 'openrouter') {
    return process.env.OPENROUTER_API_KEY || getSecureSetting('provider_key_openrouter') || null
  }
  const settingKey = PROVIDER_KEY_SETTINGS[provider]
  if (!settingKey) return null
  return getSecureSetting(settingKey) || null
}

function resolveProviderAndModel(
  agentId?: string,
  forceProvider?: string,
  forceModel?: string
): { provider: ProviderName; model: string } {
  // 1. Single-run override
  if (forceProvider && forceModel) {
    return { provider: forceProvider as ProviderName, model: forceModel }
  }

  // 2. Per-agent default
  if (agentId) {
    try {
      const db = getDb()
      const agent = db
        .prepare('SELECT default_provider, default_model FROM agents WHERE id = ?')
        .get(agentId) as { default_provider: string | null; default_model: string | null } | undefined
      if (agent?.default_provider && agent?.default_model) {
        return { provider: agent.default_provider as ProviderName, model: agent.default_model }
      }
    } catch {
      // DB might not be ready — fall through
    }
  }

  // 3. Global default from settings
  const globalProvider = getSetting('default_provider')
  const globalModel = getSetting('default_model')
  if (globalProvider && globalModel) {
    return { provider: globalProvider as ProviderName, model: globalModel }
  }

  // 4. Factory default: first available provider
  const orKey = getProviderKey('openrouter')
  if (orKey) return { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free' }

  const anthKey = getProviderKey('anthropic')
  if (anthKey) return { provider: 'anthropic', model: 'claude-sonnet-4-6' }

  const groqKey = getProviderKey('groq')
  if (groqKey) return { provider: 'groq', model: 'llama-3.3-70b-versatile' }

  const openaiKey = getProviderKey('openai')
  if (openaiKey) return { provider: 'openai', model: 'gpt-4o-mini' }

  // Check if Ollama is running synchronously (best effort)
  return { provider: 'ollama', model: 'llama3.2:3b' }
}

export async function routeRequest(options: RouteOptions): Promise<RouteResult> {
  checkBudget()

  const { provider, model } = resolveProviderAndModel(
    options.agentId,
    options.provider,
    options.model
  )

  // Apply global per-request token cap (Settings → Budget → Max tokens per request)
  const globalTokenCap = parseInt(getSetting('max_tokens_per_request') ?? '', 10)
  const maxTokens = (!isNaN(globalTokenCap) && globalTokenCap > 0)
    ? Math.min(options.maxTokens ?? 4096, globalTokenCap)
    : (options.maxTokens ?? 4096)

  // ── Anthropic (SDK-based, supports prompt caching + multimodal natively) ───
  if (provider === 'anthropic') {
    const { getAnthropicClient } = await import('./claude')
    const anthropic = getAnthropicClient()

    type AnthMessageParam = Parameters<typeof anthropic.messages.stream>[0]['messages'][number]

    // Helper: convert ChatMessage → Anthropic message param
    const toAnthParam = (m: import('./providers/types').ChatMessage): AnthMessageParam => ({
      role: m.role,
      content:
        typeof m.content === 'string'
          ? m.content
          : m.content.map((p) => {
              if (p.type === 'text') return { type: 'text' as const, text: p.text ?? '' }
              if (p.type === 'image' && p.imageData) {
                return {
                  type: 'image' as const,
                  source: {
                    type: 'base64' as const,
                    media_type: p.imageData.mediaType as
                      | 'image/jpeg'
                      | 'image/png'
                      | 'image/gif'
                      | 'image/webp',
                    data: p.imageData.base64,
                  },
                }
              }
              return { type: 'text' as const, text: '' }
            }),
    })

    const systemBlock = options.cacheSystem
      ? [{ type: 'text' as const, text: options.systemPrompt, cache_control: { type: 'ephemeral' as const } }]
      : options.systemPrompt

    // Anthropic tool format (from MCP)
    type AnthTool = { name: string; description: string; input_schema: Record<string, unknown> }
    const anthTools: AnthTool[] | undefined = options.tools?.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.input_schema as Record<string, unknown>,
    }))

    // Accumulate messages for the tool loop (mutable copy)
    const loopMessages: AnthMessageParam[] = options.messages.map(toAnthParam)
    let fullContent = ''
    let totalInputTokens = 0
    let totalOutputTokens = 0

    // Tool loop: keep calling until stop_reason === 'end_turn' or no tools
    for (let turn = 0; turn < 10; turn++) {
      const hasTools = anthTools && anthTools.length > 0

      if (turn === 0 || !hasTools) {
        // Stream first (or only) turn
        const stream = anthropic.messages.stream({
          model,
          max_tokens: maxTokens,
          system: systemBlock,
          messages: loopMessages,
          ...(hasTools ? { tools: anthTools } : {}),
        })

        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            fullContent += event.delta.text
            options.onChunk?.(event.delta.text)
          }
        }

        const finalMsg = await stream.finalMessage()
        totalInputTokens += finalMsg.usage.input_tokens
        totalOutputTokens += finalMsg.usage.output_tokens

        if (finalMsg.stop_reason !== 'tool_use' || !hasTools) break

        // Handle tool_use: extract blocks, call tools, push results
        const toolUseBlocks = finalMsg.content.filter((b) => b.type === 'tool_use') as
          { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }[]

        // Add assistant turn with tool_use blocks to loop
        loopMessages.push({ role: 'assistant', content: finalMsg.content as AnthMessageParam['content'] })

        // Call tools and build tool_result user turn
        const toolResults: { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean }[] = []
        for (const block of toolUseBlocks) {
          options.onToolCall?.(block.name, block.input)
          // Emit formatted tool call into the stream
          options.onChunk?.(`\n\n**[Tool Call]** \`${block.name}\`\n\`\`\`json\n${JSON.stringify(block.input, null, 2)}\n\`\`\`\n`)

          try {
            const { callTool } = await import('../main/mcp/manager')
            const result = await callTool(block.name, block.input)
            options.onToolResult?.(block.name, result, false)
            options.onChunk?.(`\n**[Tool Result]**\n\`\`\`\n${result.slice(0, 2000)}\n\`\`\`\n\n`)
            toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result })
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err)
            options.onToolResult?.(block.name, errMsg, true)
            options.onChunk?.(`\n**[Tool Error]** ${errMsg}\n\n`)
            toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: errMsg, is_error: true })
          }
        }
        loopMessages.push({ role: 'user', content: toolResults })
        continue  // next turn
      }

      // Non-first turns (after tool results): non-streaming intermediate call
      const resp = await anthropic.messages.create({
        model,
        max_tokens: maxTokens,
        system: systemBlock,
        messages: loopMessages,
        tools: anthTools,
      })
      totalInputTokens += resp.usage.input_tokens
      totalOutputTokens += resp.usage.output_tokens

      const textBlocks = resp.content.filter((b) => b.type === 'text') as { type: 'text'; text: string }[]
      for (const b of textBlocks) {
        fullContent += b.text
        options.onChunk?.(b.text)
      }

      if (resp.stop_reason !== 'tool_use') break

      const toolUseBlocks = resp.content.filter((b) => b.type === 'tool_use') as
        { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }[]

      loopMessages.push({ role: 'assistant', content: resp.content as AnthMessageParam['content'] })

      const toolResults: { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean }[] = []
      for (const block of toolUseBlocks) {
        options.onToolCall?.(block.name, block.input)
        options.onChunk?.(`\n\n**[Tool Call]** \`${block.name}\`\n\`\`\`json\n${JSON.stringify(block.input, null, 2)}\n\`\`\`\n`)
        try {
          const { callTool } = await import('../main/mcp/manager')
          const result = await callTool(block.name, block.input)
          options.onToolResult?.(block.name, result, false)
          options.onChunk?.(`\n**[Tool Result]**\n\`\`\`\n${result.slice(0, 2000)}\n\`\`\`\n\n`)
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result })
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err)
          options.onToolResult?.(block.name, errMsg, true)
          options.onChunk?.(`\n**[Tool Error]** ${errMsg}\n\n`)
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: errMsg, is_error: true })
        }
      }
      loopMessages.push({ role: 'user', content: toolResults })
    }

    const costs = getCostForModel(model)
    const costUsd = (totalInputTokens / 1000) * costs.input + (totalOutputTokens / 1000) * costs.output

    return { content: fullContent, model, provider, inputTokens: totalInputTokens, outputTokens: totalOutputTokens, costUsd }
  }

  // ── OpenAI-compatible providers (openrouter, openai, groq, ollama) ─────────
  const apiKey = provider === 'ollama' ? 'ollama' : (getProviderKey(provider) ?? '')
  if (!apiKey && provider !== 'ollama') {
    throw new Error(`No API key configured for ${provider}. Add it in Settings → Providers.`)
  }

  const baseUrl = PROVIDER_URLS[provider]
  if (!baseUrl) throw new Error(`Unknown provider: ${provider}`)

  // Build OpenAI-format messages
  const openaiMessages = [
    { role: 'system' as const, content: options.systemPrompt },
    ...options.messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content:
        typeof m.content === 'string'
          ? m.content
          : m.content.map((p) => {
              if (p.type === 'text') return { type: 'text' as const, text: p.text ?? '' }
              if (p.type === 'image' && p.imageData) {
                return {
                  type: 'image_url' as const,
                  image_url: {
                    url: `data:${p.imageData.mediaType};base64,${p.imageData.base64}`,
                  },
                }
              }
              return { type: 'text' as const, text: '' }
            }),
    })),
  ]

  // OpenRouter requires attribution headers
  const extraHeaders: Record<string, string> = {}
  if (provider === 'openrouter') {
    extraHeaders['HTTP-Referer'] = 'https://conductr.app'
    extraHeaders['X-Title'] = 'Conductr'
  }

  const { content, inputTokens, outputTokens } = await streamOpenAICompat({
    baseUrl,
    apiKey,
    model,
    messages: openaiMessages,
    maxTokens,
    onChunk: options.onChunk ?? (() => {}),
    extraHeaders,
  })

  const costs = getCostForModel(model)
  const costUsd = (inputTokens / 1000) * costs.input + (outputTokens / 1000) * costs.output

  return { content, model, provider, inputTokens, outputTokens, costUsd }
}

/** Backward-compatible single-turn wrapper — used by ideas.ts, prompts.ts, etc. */
export async function runWithRouter(
  systemPrompt: string,
  userPrompt: string,
  options: {
    agentId?: string
    model?: string
    provider?: string
    maxTokens?: number
    onChunk?: (text: string) => void
    cacheSystem?: boolean
  } = {}
): Promise<{ content: string; inputTokens: number; outputTokens: number; costUsd: number; model: string; provider: string }> {
  return routeRequest({
    systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
    ...options,
  })
}

/** Test a provider connection — returns ok/error and optional model count */
export async function testProviderConnection(
  provider: ProviderName,
  apiKey: string
): Promise<{ ok: boolean; error?: string; modelCount?: number }> {
  if (provider === 'anthropic') {
    // Test Anthropic by listing models
    try {
      const res = await fetch('https://api.anthropic.com/v1/models', {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
      })
      if (res.ok) {
        const data = await res.json().catch(() => ({})) as { data?: unknown[] }
        return { ok: true, modelCount: data.data?.length }
      }
      const text = await res.text().catch(() => res.statusText)
      return { ok: false, error: `${res.status}: ${text.slice(0, 200)}` }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  if (provider === 'ollama') {
    try {
      const res = await fetch('http://localhost:11434/api/tags')
      if (res.ok) {
        const data = await res.json().catch(() => ({})) as { models?: unknown[] }
        return { ok: true, modelCount: data.models?.length ?? 0 }
      }
      return { ok: false, error: 'Ollama is not running' }
    } catch {
      return { ok: false, error: 'Ollama is not installed or not running' }
    }
  }

  const baseUrl = PROVIDER_URLS[provider]
  const extraHeaders: Record<string, string> = {}
  if (provider === 'openrouter') {
    extraHeaders['HTTP-Referer'] = 'https://conductr.app'
    extraHeaders['X-Title'] = 'Conductr'
  }

  return testOpenAICompatConnection(baseUrl, apiKey, extraHeaders)
}

export { resolveProviderAndModel, getProviderKey }
