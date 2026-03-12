import { test, expect } from './fixtures'

test.describe('App Launch', () => {
  test('sidebar is visible', async ({ page }) => {
    const sidebar = page.locator('[data-testid="sidebar"]')
    await expect(sidebar).toBeVisible()
  })

  test('dashboard is the default page', async ({ page }) => {
    const dashboard = page.locator('[data-testid="dashboard-page"]')
    await expect(dashboard).toBeVisible()
  })

  test('app title is visible in sidebar', async ({ page }) => {
    const title = page.locator('[data-testid="sidebar"]').getByText('Orqis')
    await expect(title).toBeVisible()
  })
})
