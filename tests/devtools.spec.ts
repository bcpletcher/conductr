import { test, expect } from './fixtures'

test.describe('Dev Tools page', () => {
  test.beforeEach(async ({ page }) => {
    await page.click('[data-testid="nav-devtools"]')
    await expect(page.locator('[data-testid="devtools-page"]')).toBeVisible()
  })

  test('renders Dev Tools page', async ({ page }) => {
    await expect(page.locator('[data-testid="devtools-page"]')).toBeVisible()
  })

  test('shows GitHub Token section', async ({ page }) => {
    await expect(
      page.locator('[data-testid="devtools-page"]').getByText('GitHub Token')
    ).toBeVisible()
  })

  test('shows repository section', async ({ page }) => {
    await expect(
      page.locator('[data-testid="devtools-page"]')
        .getByText('Repository')
        .or(page.locator('[data-testid="devtools-page"]').getByText('Repository'))
        .first()
    ).toBeVisible()
  })
})
