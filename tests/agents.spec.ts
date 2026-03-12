import { test, expect } from './fixtures'

test.describe('Agents', () => {
  test.beforeEach(async ({ page }) => {
    await page.click('[data-testid="nav-agents"]')
    await expect(page.locator('[data-testid="agents-page"]')).toBeVisible()
  })

  test('Lyra agent is pre-seeded and visible', async ({ page }) => {
    await expect(page.getByText('Lyra')).toBeVisible()
  })

  test('agent detail shows when selected', async ({ page }) => {
    // Lyra should auto-select as first agent
    await expect(page.getByText('Hidden Directives').or(page.getByText('Operational Role'))).toBeVisible()
  })
})
