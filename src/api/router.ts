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

    // Build Anthropic-format messages
    type AnthMessageParam = Parameters<typeof anthropic.messages.stream>[0]['messages'][number]
    const anthMessages: AnthMessageParam[] = options.messages.map((m) => ({
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
    }))

    const systemBlock = options.cacheSystem
      ? [
          {
            type: 'text' as const,
            text: options.systemPrompt,
            cache_control: { type: 'ephemeral' as const },
          },
        ]
      : options.systemPrompt

    let fullContent = ''
    const stream = anthropic.messages.stream({
      model,
      max_tokens: maxTokens,
      system: systemBlock,
      messages: anthMessages,
    })

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        fullContent += event.delta.text
        options.onChunk?.(event.delta.text)
      }
    }

    const finalMsg = await stream.finalMessage()
    const inputTokens = finalMsg.usage.input_tokens
    const outputTokens = finalMsg.usage.output_tokens
    const costs = getCostForModel(model)
    const costUsd = (inputTokens / 1000) * costs.input + (outputTokens / 1000) * costs.output

    return { content: fullContent, model, provider, inputTokens, outputTokens, costUsd }
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
