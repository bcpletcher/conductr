import { test, expect } from './fixtures'

test.describe('Metrics', () => {
  test.beforeEach(async ({ page }) => {
    await page.click('[data-testid="nav-metrics"]')
    await expect(page.locator('[data-testid="metrics-page"]')).toBeVisible()
  })

  test('metric cards are present', async ({ page }) => {
    await expect(page.locator('[data-testid="metric-today-s-spend"]')).toBeVisible()
    await expect(page.locator('[data-testid="metric-7-day-billing"]')).toBeVisible()
    await expect(page.locator('[data-testid="metric-monthly-tokens"]')).toBeVisible()
    await expect(page.locator('[data-testid="metric-top-model"]')).toBeVisible()
  })

  test('7-day spend chart section is visible', async ({ page }) => {
    await expect(page.getByText('7-Day Spend')).toBeVisible()
  })
})
