import { test, expect } from './fixtures'

test.describe('Journal', () => {
  test.beforeEach(async ({ page }) => {
    await page.click('[data-testid="nav-journal"]')
    await expect(page.locator('[data-testid="journal-page"]')).toBeVisible()
  })

  test('shows page heading', async ({ page }) => {
    await expect(
      page.locator('[data-testid="journal-page"]')
        .getByRole('heading', { name: 'Journal' })
    ).toBeVisible()
  })

  test('new entry button is present', async ({ page }) => {
    await expect(page.locator('[data-testid="journal-new-entry-btn"]')).toBeVisible()
  })

  test('can create a manual entry', async ({ page }) => {
    await page.click('[data-testid="journal-new-entry-btn"]')
    await expect(page.locator('[data-testid="journal-entry-title"]')).toBeVisible()
    await page.fill('[data-testid="journal-entry-title"]', 'Test Journal Entry')
    await page.fill('[data-testid="journal-entry-content"]', 'This is a test entry.')
    await page.click('[data-testid="journal-entry-submit"]')
    await expect(page.getByText('Test Journal Entry').first()).toBeVisible()
  })
})
