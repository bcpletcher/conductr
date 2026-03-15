import { test, expect } from './fixtures'

test.describe('Dev Tools page', () => {
  test.beforeEach(async ({ page }) => {
    await page.click('[data-testid="nav-devtools"]')
    await expect(page.locator('[data-testid="devtools-page"]')).toBeVisible()
  })

  test('renders Dev Tools page', async ({ page }) => {
    await expect(page.locator('[data-testid="devtools-page"]')).toBeVisible()
  })

  test('shows Dev Tools tab bar', async ({ page }) => {
    // Tab bar always visible regardless of active tab
    await expect(
      page.locator('[data-testid="devtools-page"]').getByRole('button', { name: 'Repos' })
    ).toBeVisible()
    await expect(
      page.locator('[data-testid="devtools-page"]').getByRole('button', { name: 'GitHub' })
    ).toBeVisible()
  })

  test('shows Developer Tools heading', async ({ page }) => {
    await expect(
      page.locator('[data-testid="devtools-page"]').getByRole('heading', { name: 'Developer Tools' })
    ).toBeVisible()
  })
})
