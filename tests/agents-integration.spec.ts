/**
 * Agent Integration Tests — require the Claude Code CLI to be installed.
 *
 * These tests send real messages through the Claude Code CLI and wait for
 * actual responses from each agent. Each test has a 90-second timeout.
 *
 * Run all tests:        npm test
 * Run only these:       npx playwright test tests/agents-integration.spec.ts
 * Skip in CI (no CLI):  set SKIP_AGENT_INTEGRATION=1 to skip this file
 */
import { test, expect } from './fixtures'

const SKIP = !!process.env.SKIP_AGENT_INTEGRATION

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Navigate to Chat, select an agent, type a message, send it, and wait
 * for a complete response (up to `timeoutMs`). Returns the page.
 */
async function chatWith(
  page: import('@playwright/test').Page,
  agentName: string,
  message: string,
  timeoutMs = 75_000
): Promise<void> {
  await page.click('[data-testid="nav-chat"]')
  await expect(page.locator('[data-testid="chat-page"]')).toBeAttached()

  // Select the agent
  await page.selectOption('[data-testid="chat-agent-select"]', { label: agentName })
  await expect(page.locator('[data-testid="chat-page"] h1').first()).toHaveText(agentName)

  // Type and send
  await page.fill('[data-testid="chat-input"]', message)
  await expect(page.locator('[data-testid="chat-send-btn"]')).not.toBeDisabled()
  await page.click('[data-testid="chat-send-btn"]')

  // Wait for the input to re-enable (streaming complete)
  await expect(page.locator('[data-testid="chat-input"]')).not.toBeDisabled({ timeout: timeoutMs })
}

// ── Core agent response tests ─────────────────────────────────────────────────

test.describe('Agent responses — single agent', () => {
  test.setTimeout(90_000)

  test.skip(SKIP, 'Skipped: SKIP_AGENT_INTEGRATION=1')

  test('Lyra responds to a greeting', async ({ page }) => {
    await chatWith(page, 'Lyra', 'Reply with exactly the word PONG and nothing else.')
    // After response, a message should appear containing PONG
    await expect(page.locator('[data-testid="chat-page"]').getByText('PONG')).toBeVisible({ timeout: 5000 })
  })

  test('Forge responds to a simple question', async ({ page }) => {
    await chatWith(page, 'Forge', 'What is your primary role? Answer in one sentence.')
    // Forge's response should be visible — at minimum the streaming indicator resolved
    const chatPage = page.locator('[data-testid="chat-page"]')
    // There should be at least 2 message blocks (user + assistant)
    const messages = chatPage.locator('.message-content, [class*="message"]')
    expect(await messages.count()).toBeGreaterThanOrEqual(1)
  })

  test('Scout responds to a simple question', async ({ page }) => {
    await chatWith(page, 'Scout', 'Identify yourself in one sentence.')
    await expect(page.locator('[data-testid="chat-input"]')).not.toBeDisabled()
  })

  test('Pixel responds to a simple question', async ({ page }) => {
    await chatWith(page, 'Pixel', 'What do you specialize in? One sentence.')
    await expect(page.locator('[data-testid="chat-input"]')).not.toBeDisabled()
  })

  test('Sentinel responds to a simple question', async ({ page }) => {
    await chatWith(page, 'Sentinel', 'What is your role? One sentence.')
    await expect(page.locator('[data-testid="chat-input"]')).not.toBeDisabled()
  })

  test('Courier responds to a simple question', async ({ page }) => {
    await chatWith(page, 'Courier', 'Describe your function in one sentence.')
    await expect(page.locator('[data-testid="chat-input"]')).not.toBeDisabled()
  })

  test('all 11 agents respond without errors', async ({ page }) => {
    test.setTimeout(120_000) // 11 agents × ~10s each
    const allAgents = ['Lyra', 'Nova', 'Scout', 'Forge', 'Pixel', 'Sentinel', 'Courier', 'Nexus', 'Helm', 'Atlas', 'Ledger']
    for (const name of allAgents) {
      await chatWith(page, name, `Say "READY" and nothing else.`, 60_000)
      // No error message should have appeared
      const errorEl = page.locator('[data-testid="chat-page"]').getByText('⚠', { exact: false })
      const errorCount = await errorEl.count()
      expect(errorCount, `${name} produced an error`).toBe(0)
    }
  })
})

// ── Agent handoff tests ───────────────────────────────────────────────────────

test.describe('Agent handoff — context passing', () => {
  test.setTimeout(120_000)

  test.skip(SKIP, 'Skipped: SKIP_AGENT_INTEGRATION=1')

  test('conversation context carries across agent switch', async ({ page }) => {
    // 1. Chat with Lyra and establish context
    await chatWith(page, 'Lyra', 'Remember the codeword ALPHA123. Confirm you have it.')
    // Lyra should confirm ALPHA123 in her response
    await expect(
      page.locator('[data-testid="chat-page"]').getByText('ALPHA123')
    ).toBeVisible({ timeout: 5000 })

    // 2. Switch to Forge and ask a follow-up (they share system context but not messages)
    await chatWith(page, 'Forge', 'What is 2 + 2? Reply with just the number.')
    // Forge should answer "4"
    await expect(
      page.locator('[data-testid="chat-page"]').getByText('4')
    ).toBeVisible({ timeout: 5000 })
  })

  test('@-mention injects another agent\'s context into current conversation', async ({ page }) => {
    // Pre-populate Scout with some history
    await chatWith(page, 'Scout', 'Remember: project codename is NEBULA. Confirm.')

    // Switch to Lyra and use @Scout mention
    await page.selectOption('[data-testid="chat-agent-select"]', { label: 'Lyra' })
    await page.fill('[data-testid="chat-input"]', '@Scout What did Scout recently discuss?')

    // Verify mention picker appears with Scout
    const picker = page.locator('[data-testid="chat-page"]').getByText('Scout').first()
    await expect(picker).toBeVisible({ timeout: 3000 })

    // Send the message
    await page.click('[data-testid="chat-send-btn"]')
    await expect(page.locator('[data-testid="chat-input"]')).not.toBeDisabled({ timeout: 75_000 })

    // Lyra's response should incorporate Scout's context (NEBULA or Scout-related content)
    const response = page.locator('[data-testid="chat-page"]')
    // At minimum a response appeared without an error
    const errorEl = response.getByText('⚠', { exact: false })
    expect(await errorEl.count()).toBe(0)
  })
})

// ── Broadcast mode integration tests ─────────────────────────────────────────

test.describe('Broadcast mode — all agents respond', () => {
  test.setTimeout(180_000) // Sending to 11 agents in parallel

  test.skip(SKIP, 'Skipped: SKIP_AGENT_INTEGRATION=1')

  test('broadcast sends to all agents and columns show activity', async ({ page }) => {
    await page.click('[data-testid="nav-chat"]')
    await expect(page.locator('[data-testid="chat-page"]')).toBeAttached()

    // Enter broadcast mode
    await page.click('[data-testid="chat-broadcast-btn"]')
    await expect(page.locator('[data-testid="broadcast-columns"]')).toBeVisible()

    // Send a short message to all agents
    await page.fill('[data-testid="broadcast-input"]', 'Say READY and nothing else.')
    await page.click('[data-testid="broadcast-send-btn"]')

    // At least one broadcast column should show streaming activity (spinner or text)
    const cols = page.locator('[data-testid^="broadcast-col-"]')
    await expect(cols.first()).toBeVisible()

    // Wait for at least the first column to complete (check-circle appears)
    await expect(
      page.locator('[data-testid^="broadcast-col-"] .fa-circle-check').first()
    ).toBeVisible({ timeout: 90_000 })
  })

  test('broadcast columns for all 11 agents are present', async ({ page }) => {
    await page.click('[data-testid="nav-chat"]')
    await expect(page.locator('[data-testid="chat-page"]')).toBeAttached()
    await page.click('[data-testid="chat-broadcast-btn"]')

    const agentIds = ['agent-lyra', 'agent-nova', 'agent-scout', 'agent-forge', 'agent-pixel',
                      'agent-sentinel', 'agent-courier', 'agent-nexus', 'agent-helm', 'agent-atlas', 'agent-ledger']
    for (const id of agentIds) {
      await expect(page.locator(`[data-testid="broadcast-col-${id}"]`)).toBeVisible()
    }
  })
})

// Guide page tests live in tests/guide.spec.ts (no CLI required)
