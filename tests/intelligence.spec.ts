import { test, expect } from './fixtures'

test.describe('Intelligence', () => {
  test.beforeEach(async ({ page }) => {
    await page.click('[data-testid="nav-intelligence"]')
    await expect(page.locator('[data-testid="intelligence-page"]')).toBeVisible()
  })

  test('shows page heading', async ({ page }) => {
    await expect(
      page.locator('[data-testid="intelligence-page"]')
        .getByRole('heading', { name: 'Intelligence' })
    ).toBeVisible()
  })

  test('generate insight button is present', async ({ page }) => {
    await expect(page.getByRole('button', { name: /generate insight/i })).toBeVisible()
  })

  test('generate recap button is present', async ({ page }) => {
    await expect(page.getByRole('button', { name: /generate recap/i })).toBeVisible()
  })

  test('shows page content area', async ({ page }) => {
    await expect(
      page.locator('[data-testid="intelligence-page"] .card').first()
    ).toBeVisible()
  })
})
