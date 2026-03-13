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
    await expect(page.locator('[data-testid="chat-export-btn"]')).not.toBeVisible()
    await expect(page.locator('[data-testid="chat-save-doc-btn"]')).not.toBeVisible()
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
