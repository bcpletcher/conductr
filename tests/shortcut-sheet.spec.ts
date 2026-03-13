import { test, expect } from './fixtures'

test.describe('Shortcut Sheet (Cmd+/)', () => {
  test('opens with Cmd+/', async ({ page }) => {
    await page.keyboard.press('Meta+/')
    await expect(page.locator('[data-testid="shortcut-sheet"]')).toBeVisible()
  })

  test('shows keyboard shortcut groups', async ({ page }) => {
    await page.keyboard.press('Meta+/')
    const sheet = page.locator('[data-testid="shortcut-sheet"]')
    await expect(sheet).toBeVisible()
    await expect(sheet.getByText('Global')).toBeVisible()
    await expect(sheet.getByText('Workshop')).toBeVisible()
    await expect(sheet.getByText('Open command palette')).toBeVisible()
  })

  test('closes with Escape', async ({ page }) => {
    await page.keyboard.press('Meta+/')
    await expect(page.locator('[data-testid="shortcut-sheet"]')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-testid="shortcut-sheet"]')).not.toBeVisible()
  })

  test('closes by clicking backdrop', async ({ page }) => {
    await page.keyboard.press('Meta+/')
    await expect(page.locator('[data-testid="shortcut-sheet"]')).toBeVisible()
    // Click far corner (outside modal)
    await page.locator('[data-testid="shortcut-sheet"]').click({ position: { x: 5, y: 5 } })
    await expect(page.locator('[data-testid="shortcut-sheet"]')).not.toBeVisible()
  })
})
