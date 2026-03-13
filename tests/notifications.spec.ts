import { test, expect } from './fixtures'

test.describe('Notification Center', () => {
  test('bell button is visible in sidebar', async ({ page }) => {
    await expect(page.locator('[data-testid="notif-bell"]')).toBeVisible()
  })

  test('clicking bell opens notification panel', async ({ page }) => {
    await page.click('[data-testid="notif-bell"]')
    await expect(page.locator('[data-testid="notif-panel"]')).toBeVisible()
  })

  test('panel shows empty state when no notifications', async ({ page }) => {
    await page.click('[data-testid="notif-bell"]')
    const panel = page.locator('[data-testid="notif-panel"]')
    await expect(panel).toBeVisible()
    await expect(panel.getByText('No notifications')).toBeVisible()
  })

  test('panel closes with Escape', async ({ page }) => {
    await page.click('[data-testid="notif-bell"]')
    await expect(page.locator('[data-testid="notif-panel"]')).toBeVisible()
    await page.keyboard.press('Escape')
    // Panel slides out — use not.toBeVisible (opacity 0 + pointer-events none)
    await expect(page.locator('[data-testid="notif-panel"]')).not.toBeVisible()
  })

  test('panel closes by clicking backdrop', async ({ page }) => {
    await page.click('[data-testid="notif-bell"]')
    await expect(page.locator('[data-testid="notif-panel"]')).toBeVisible()
    await page.locator('[data-testid="notif-backdrop"]').click()
    await expect(page.locator('[data-testid="notif-panel"]')).not.toBeVisible()
  })
})
