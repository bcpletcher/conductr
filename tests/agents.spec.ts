import { test, expect } from './fixtures'

test.describe('Agents', () => {
  test.beforeEach(async ({ page }) => {
    await page.click('[data-testid="nav-agents"]')
    await expect(page.locator('[data-testid="agents-page"]')).toBeVisible()
  })

  test('Lyra agent is pre-seeded and visible', async ({ page }) => {
    // Use h3 to scope to the agent list sidebar item specifically
    await expect(page.getByRole('heading', { name: 'Lyra', level: 3 })).toBeVisible()
  })

  test('agent detail shows when selected', async ({ page }) => {
    // Lyra should auto-select as first agent — either section label is present
    await expect(
      page.getByText('Hidden Directives').or(page.getByText('Operational Role')).first()
    ).toBeVisible()
  })
})
