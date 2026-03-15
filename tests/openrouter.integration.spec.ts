/**
 * Integration tests — real LLM calls through Conductr's multi-provider router.
 *
 * Provider waterfall (tests try in this order):
 *   1. Anthropic  — if ANTHROPIC_API_KEY has credits
 *   2. OpenRouter — if OPENROUTER_API_KEY is set (may hit free-tier rate limits)
 *
 * NOTE on free-tier limits: OpenRouter's free `:free` models are served by Venice,
 * a shared upstream with a ~8 req/min GLOBAL rate limit across all users. This is
 * a production concern too — users hitting this limit should add OpenRouter credits
 * or configure a direct provider key in Settings → Providers.
 *
 * Run with: npm run test:integration
 */
import { test as base, type ElectronApplication, type Page, expect } from '@playwright/test'
import { _electron as electron } from 'playwright'
import path from 'path'
import fs from 'fs'

// Load .env file into process.env (electron-vite doesn't bake values at runtime)
function loadDotEnv(): Record<string, string> {
  const envPath = path.join(__dirname, '..', '.env')
  const extra: Record<string, string> = {}
  if (!fs.existsSync(envPath)) return extra
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim()
    extra[key] = val
    if (!process.env[key]) process.env[key] = val
  }
  return extra
}

const dotEnvVars = loadDotEnv()

// ── Fixture ────────────────────────────────────────────────────────────────

type Fixtures = { app: ElectronApplication; page: Page }

const test = base.extend<Fixtures>({
  app: async ({}, use) => {
    const instance = await electron.launch({
      args: [path.join(__dirname, '..', 'out', 'main', 'index.js')],
      env: { ...process.env, ...dotEnvVars, NODE_ENV: 'test' },
    })
    await use(instance)
    await instance.close()
  },
  page: async ({ app }, use) => {
    const win = await app.firstWindow()
    await win.waitForSelector('[data-testid="sidebar"]', { timeout: 15000 })
    await use(win)
  },
})

// ── LLM call helper ────────────────────────────────────────────────────────

type PromptResult = {
  content: string; model: string; provider: string
  inputTokens: number; outputTokens: number; costUsd: number
}

async function runPrompt(
  page: Page,
  system: string,
  user: string,
  opts: Record<string, unknown> = {}
): Promise<PromptResult> {
  return page.evaluate(
    ({ system, user, opts }) =>
      // @ts-expect-error — electronTestAPI is injected in test mode only
      window.electronTestAPI.runPrompt(system, user, opts),
    { system, user, opts }
  )
}

// Try a prompt with retry on 429 (Venice rate limit) — up to 3 attempts with 20s backoff
async function runPromptWithRetry(
  page: Page,
  system: string,
  user: string,
  opts: Record<string, unknown> = {}
): Promise<PromptResult | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 20000))
    try {
      return await runPrompt(page, system, user, opts)
    } catch (err) {
      const msg = (err as Error).message
      // Anthropic: out of credits — don't retry
      if (msg.includes('credit balance is too low')) return null
      // Venice/OpenRouter: rate limited — retry after backoff
      if (msg.includes('429')) continue
      throw err  // unexpected error — propagate
    }
  }
  return null  // rate limit exhausted after all retries
}

// Pick the best available provider to use for content tests
async function pickWorkingProvider(page: Page): Promise<{ provider: string; model: string } | null> {
  // Try Anthropic first (fast, reliable, accurate)
  const anthResult = await runPromptWithRetry(
    page, 'Reply only: "ok"', 'ping',
    { provider: 'anthropic', model: 'claude-haiku-4-5-20251001' }
  )
  if (anthResult) return { provider: 'anthropic', model: 'claude-haiku-4-5-20251001' }

  // Fall back to OpenRouter free tier
  const orResult = await runPromptWithRetry(
    page, 'Reply only: "ok"', 'ping',
    { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free' }
  )
  if (orResult) return { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free' }

  return null  // no provider has working credits/quota right now
}

// ── Tests ──────────────────────────────────────────────────────────────────

test('provider status: configured providers are detected correctly', async ({ page }) => {
  const status: Record<string, { configured: boolean; maskedKey?: string }> = await page.evaluate(() =>
    // @ts-expect-error
    window.electronAPI.providers.getStatus()
  )

  // At least one of Anthropic / OpenRouter should be configured
  const hasAny = status['anthropic']?.configured || status['openrouter']?.configured
  expect(hasAny, 'At least one LLM provider must be configured').toBe(true)

  // Ollama always reports configured (no key needed)
  expect(status['ollama']?.configured).toBe(true)

  // Keys should be masked if present
  if (status['anthropic']?.maskedKey) {
    expect(status['anthropic'].maskedKey.length).toBeLessThan(25)
  }
  if (status['openrouter']?.maskedKey) {
    expect(status['openrouter'].maskedKey.length).toBeLessThan(25)
  }
})

test('LLM routing: basic prompt returns content with token tracking', async ({ page }) => {
  const ctx = await pickWorkingProvider(page)
  if (!ctx) { test.skip(); return }

  const result = await runPromptWithRetry(
    page,
    'You are a helpful assistant. Reply with plain text only.',
    'Say the word "pong" and nothing else.',
    { provider: ctx.provider, model: ctx.model }
  )

  if (!result) { test.skip(); return }

  expect(result.content.toLowerCase()).toContain('pong')
  expect(result.provider).toBe(ctx.provider)
  expect(result.inputTokens).toBeGreaterThan(0)
  expect(result.outputTokens).toBeGreaterThan(0)
  // Free models cost $0; paid models cost > $0
  expect(result.costUsd).toBeGreaterThanOrEqual(0)
})

test('agent routing: Lyra, Forge, Courier each get correct responses', async ({ page }) => {
  const ctx = await pickWorkingProvider(page)
  if (!ctx) { test.skip(); return }

  const agents = [
    { id: 'agent-lyra',    name: 'Lyra'    },
    { id: 'agent-forge',   name: 'Forge'   },
    { id: 'agent-courier', name: 'Courier' },
  ]

  for (const agent of agents) {
    const result = await runPromptWithRetry(
      page,
      `You are ${agent.name}. Reply only with the word "ready".`,
      'Confirm you are online.',
      { ...ctx, agentId: agent.id }
    )
    if (!result) { test.skip(); return }  // provider quota exhausted mid-test
    expect(result.content.toLowerCase(), `${agent.name} should return content`).toContain('ready')
    expect(result.provider).toBe(ctx.provider)
  }
})

test('agent pipeline: Lyra plans, Forge acknowledges', async ({ page }) => {
  const ctx = await pickWorkingProvider(page)
  if (!ctx) { test.skip(); return }

  const lyraResult = await runPromptWithRetry(
    page,
    'You are Lyra, lead orchestrator. Write a one-sentence plan for the backend engineer.',
    'Task: add a /health endpoint to the Express API.',
    { ...ctx, agentId: 'agent-lyra' }
  )
  if (!lyraResult) { test.skip(); return }
  expect(lyraResult.content.length).toBeGreaterThan(10)

  const forgeResult = await runPromptWithRetry(
    page,
    'You are Forge, backend engineer. Acknowledge the plan in one sentence.',
    `Plan: ${lyraResult.content}`,
    { ...ctx, agentId: 'agent-forge' }
  )
  if (!forgeResult) { test.skip(); return }
  expect(forgeResult.content.length).toBeGreaterThan(10)

  // Both calls tracked
  expect(lyraResult.inputTokens + forgeResult.inputTokens).toBeGreaterThan(0)
})
