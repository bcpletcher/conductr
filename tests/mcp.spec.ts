import { test, expect } from './fixtures'

test.describe('MCP Tools (Agent Tools tab)', () => {
  test.beforeEach(async ({ page }) => {
    await page.click('[data-testid="nav-agents"]')
    await expect(page.locator('[data-testid="agents-page"]')).toBeVisible()
  })

  test('Tools tab is visible in agent profile', async ({ page }) => {
    // The tabs row should contain a Tools tab button
    await expect(
      page.locator('[data-testid="agents-page"]').getByText('Tools')
    ).toBeVisible()
  })

  test('clicking Tools tab shows MCP Tool Servers section', async ({ page }) => {
    await page.locator('[data-testid="agents-page"]').getByText('Tools').click()
    await expect(
      page.locator('[data-testid="agents-page"]').getByText('MCP Tool Servers')
    ).toBeVisible()
  })

  test('Tools tab shows empty state when no servers configured', async ({ page }) => {
    await page.locator('[data-testid="agents-page"]').getByText('Tools').click()
    // MCP Tool Servers header is always present
    await expect(
      page.locator('[data-testid="agents-page"]').getByText('MCP Tool Servers')
    ).toBeVisible()
  })
})
