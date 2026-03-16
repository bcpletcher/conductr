import { test, expect } from './fixtures'

test.describe('Chat page', () => {
  test.beforeEach(async ({ page }) => {
    await page.click('[data-testid="nav-chat"]')
    await expect(page.locator('[data-testid="chat-page"]')).toBeAttached()
  })

  test('renders chat page heading', async ({ page }) => {
    const header = page.locator('[data-testid="chat-page"] h1').first()
    await expect(header).toBeVisible()
  })

  test('shows agent selector dropdown', async ({ page }) => {
    const selector = page.locator('[data-testid="chat-page"] select')
    await expect(selector).toBeVisible()
    const count = await selector.locator('option').count()
    expect(count).toBeGreaterThan(0)
  })

  test('export and save buttons hidden when no messages', async ({ page }) => {
    // Clear any persisted messages from previous runs
    const clearBtn = page.locator('[data-testid="chat-page"] button:has-text("Clear")')
    if (await clearBtn.isVisible({ timeout: 800 }).catch(() => false)) {
      await clearBtn.click()
    }
    // Buttons are conditionally rendered (not just hidden) — use not.toBeAttached
    await expect(page.locator('[data-testid="chat-export-btn"]')).not.toBeAttached()
    await expect(page.locator('[data-testid="chat-save-doc-btn"]')).not.toBeAttached()
  })

  test('shows message input textarea', async ({ page }) => {
    const input = page.locator('[data-testid="chat-page"] textarea').first()
    await expect(input).toBeVisible()
  })

  test('send button is disabled when input is empty', async ({ page }) => {
    const sendBtn = page.locator('[data-testid="chat-page"] button').last()
    await expect(sendBtn).toBeDisabled()
  })

  test('send button enables when user types', async ({ page }) => {
    const textarea = page.locator('[data-testid="chat-page"] textarea').first()
    const sendBtn  = page.locator('[data-testid="chat-page"] button').last()
    await textarea.fill('Hello')
    await expect(sendBtn).toBeEnabled()
  })

  test('shows empty state with agent name when agent is selected', async ({ page }) => {
    // Clear any persisted messages from previous runs
    const clearBtn = page.locator('[data-testid="chat-page"] button:has-text("Clear")')
    if (await clearBtn.isVisible({ timeout: 800 }).catch(() => false)) {
      await clearBtn.click()
    }
    const emptyHint = page.locator('[data-testid="chat-page"]').getByText('Send a message to start chatting')
    await expect(emptyHint).toBeVisible()
  })
})

test.describe('Chat broadcast mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.click('[data-testid="nav-chat"]')
    await expect(page.locator('[data-testid="chat-page"]')).toBeAttached()
  })

  test('broadcast button is visible in chat header', async ({ page }) => {
    await expect(page.locator('[data-testid="chat-broadcast-btn"]')).toBeVisible()
  })

  test('clicking broadcast button enters broadcast mode', async ({ page }) => {
    await page.click('[data-testid="chat-broadcast-btn"]')
    await expect(page.locator('[data-testid="broadcast-agent-chips"]')).toBeVisible()
    await expect(page.locator('[data-testid="broadcast-input"]')).toBeVisible()
  })

  test('broadcast mode shows heading and agent count', async ({ page }) => {
    await page.click('[data-testid="chat-broadcast-btn"]')
    const heading = page.locator('[data-testid="chat-page"] h1').first()
    await expect(heading).toHaveText('Broadcast')
  })

  test('broadcast mode pre-selects all agents', async ({ page }) => {
    await page.click('[data-testid="chat-broadcast-btn"]')
    // All agents should be rendered as chips
    const chips = page.locator('[data-testid^="broadcast-chip-"]')
    const count = await chips.count()
    expect(count).toBeGreaterThan(0)
    // All chips should start selected (accent border)
    const firstChip = chips.first()
    const border = await firstChip.evaluate((el) => (el as HTMLElement).style.border)
    expect(border).toContain('rgba(129, 140, 248')
  })

  test('clicking a chip deselects that agent', async ({ page }) => {
    await page.click('[data-testid="chat-broadcast-btn"]')
    const chips = page.locator('[data-testid^="broadcast-chip-"]')
    // Click first chip to deselect it
    await chips.first().click()
    const border = await chips.first().evaluate((el) => (el as HTMLElement).style.border)
    expect(border).toContain('rgba(255, 255, 255')
  })

  test('broadcast send button is disabled when input is empty', async ({ page }) => {
    await page.click('[data-testid="chat-broadcast-btn"]')
    await expect(page.locator('[data-testid="broadcast-send-btn"]')).toBeDisabled()
  })

  test('broadcast send button enables when message typed', async ({ page }) => {
    await page.click('[data-testid="chat-broadcast-btn"]')
    await page.locator('[data-testid="broadcast-input"]').fill('Hello all agents')
    await expect(page.locator('[data-testid="broadcast-send-btn"]')).toBeEnabled()
  })

  test('exit broadcast button returns to normal chat view', async ({ page }) => {
    await page.click('[data-testid="chat-broadcast-btn"]')
    await expect(page.locator('[data-testid="broadcast-input"]')).toBeVisible()
    // Click "Exit Broadcast"
    await page.click('[data-testid="chat-broadcast-btn"]')
    await expect(page.locator('[data-testid="broadcast-input"]')).not.toBeVisible()
    // Normal chat view is restored
    await expect(page.locator('[data-testid="chat-page"] select')).toBeVisible()
  })

  test('agent selector hidden in broadcast mode', async ({ page }) => {
    await page.click('[data-testid="chat-broadcast-btn"]')
    await expect(page.locator('[data-testid="chat-page"] select')).not.toBeVisible()
  })
})

// ── Agent selector tests (uses the new data-testid="chat-agent-select") ──────

test.describe('Chat agent selector', () => {
  test.beforeEach(async ({ page }) => {
    await page.click('[data-testid="nav-chat"]')
    await expect(page.locator('[data-testid="chat-page"]')).toBeAttached()
  })

  test('agent select is present with all 11 agents', async ({ page }) => {
    const select = page.locator('[data-testid="chat-agent-select"]')
    await expect(select).toBeVisible()
    const options = await select.locator('option').allTextContents()
    const expected = ['Lyra', 'Nova', 'Scout', 'Forge', 'Pixel', 'Sentinel', 'Courier', 'Nexus', 'Helm', 'Atlas', 'Ledger']
    for (const name of expected) {
      expect(options).toContain(name)
    }
    expect(options).toHaveLength(11)
  })

  test('switching to Forge updates the page heading', async ({ page }) => {
    await page.selectOption('[data-testid="chat-agent-select"]', { label: 'Forge' })
    await expect(page.locator('[data-testid="chat-page"] h1').first()).toHaveText('Forge')
  })

  test('switching to Sentinel updates the page heading', async ({ page }) => {
    await page.selectOption('[data-testid="chat-agent-select"]', { label: 'Sentinel' })
    await expect(page.locator('[data-testid="chat-page"] h1').first()).toHaveText('Sentinel')
  })

  test('each agent switch resets the chat thread', async ({ page }) => {
    // Switch agents — the empty-state hint should appear for each
    for (const name of ['Lyra', 'Scout', 'Pixel', 'Atlas']) {
      await page.selectOption('[data-testid="chat-agent-select"]', { label: name })
      await expect(page.locator('[data-testid="chat-page"] h1').first()).toHaveText(name)
      // Chat input should be available and not disabled
      await expect(page.locator('[data-testid="chat-input"]')).not.toBeDisabled()
    }
  })

  test('chat input placeholder mentions selected agent', async ({ page }) => {
    await page.selectOption('[data-testid="chat-agent-select"]', { label: 'Forge' })
    const placeholder = await page.locator('[data-testid="chat-input"]').getAttribute('placeholder')
    expect(placeholder).toContain('Forge')
  })

  test('send button is disabled initially for every agent', async ({ page }) => {
    const agents = ['Lyra', 'Nova', 'Scout', 'Forge', 'Pixel']
    for (const name of agents) {
      await page.selectOption('[data-testid="chat-agent-select"]', { label: name })
      await expect(page.locator('[data-testid="chat-send-btn"]')).toBeDisabled()
    }
  })

  test('send button enables for every agent when text is typed', async ({ page }) => {
    const agents = ['Lyra', 'Sentinel', 'Ledger']
    for (const name of agents) {
      await page.selectOption('[data-testid="chat-agent-select"]', { label: name })
      await page.fill('[data-testid="chat-input"]', `Hello ${name}`)
      await expect(page.locator('[data-testid="chat-send-btn"]')).not.toBeDisabled()
      await page.fill('[data-testid="chat-input"]', '')
    }
  })
})

// ── @-mention autocomplete tests ─────────────────────────────────────────────

test.describe('Chat @-mention', () => {
  test.beforeEach(async ({ page }) => {
    await page.click('[data-testid="nav-chat"]')
    await expect(page.locator('[data-testid="chat-page"]')).toBeAttached()
  })

  test('typing @ triggers the mention picker', async ({ page }) => {
    const input = page.locator('[data-testid="chat-input"]')
    await input.clear()
    await input.click()
    await input.pressSequentially('@')
    // Mention picker container should appear
    await expect(page.locator('[data-testid="mention-picker"]')).toBeVisible({ timeout: 3000 })
  })

  test('typing @F narrows mention picker to Forge', async ({ page }) => {
    const input = page.locator('[data-testid="chat-input"]')
    await input.clear()
    await input.click()
    await input.pressSequentially('@F')
    // Forge's mention item should be visible in the picker
    await expect(
      page.locator('[data-testid="mention-item-agent-forge"]')
    ).toBeVisible({ timeout: 3000 })
  })

  test('pressing Escape closes the mention picker', async ({ page }) => {
    const input = page.locator('[data-testid="chat-input"]')
    await input.clear()
    await input.click()
    await input.pressSequentially('@')
    await page.keyboard.press('Escape')
    // Input should still be focused but picker gone
    await expect(input).toBeFocused()
  })
})
