import { test, expect } from './fixtures'

test.describe('Modal', () => {
  test('opens and closes via close button', async ({ page }) => {
    await page.click('[data-testid="nav-workshop"]')
    await expect(page.locator('[data-testid="workshop-page"]')).toBeVisible()

    // Open modal
    await page.click('text=+ New Task')
    await expect(page.locator('[data-testid="modal-overlay"]')).toBeVisible()

    // Close via button
    await page.click('[data-testid="modal-close"]')
    await expect(page.locator('[data-testid="modal-overlay"]')).not.toBeVisible()
  })

  test('closes on Escape key', async ({ page }) => {
    await page.click('[data-testid="nav-workshop"]')
    await page.click('text=+ New Task')
    await expect(page.locator('[data-testid="modal-overlay"]')).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(page.locator('[data-testid="modal-overlay"]')).not.toBeVisible()
  })
})
