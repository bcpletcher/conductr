import { test, expect } from './fixtures'

test.describe('Command Palette', () => {
  test('opens with Cmd+K', async ({ page }) => {
    await page.keyboard.press('Meta+k')
    await expect(page.locator('[data-testid="command-palette"]')).toBeVisible()
  })

  test('closes with Escape', async ({ page }) => {
    await page.keyboard.press('Meta+k')
    await expect(page.locator('[data-testid="command-palette"]')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-testid="command-palette"]')).not.toBeVisible()
  })

  test('closes by clicking backdrop', async ({ page }) => {
    await page.keyboard.press('Meta+k')
    await expect(page.locator('[data-testid="command-palette"]')).toBeVisible()
    // Click the backdrop (the outer overlay, not the modal card)
    await page.locator('[data-testid="command-palette"]').click({ position: { x: 10, y: 10 } })
    await expect(page.locator('[data-testid="command-palette"]')).not.toBeVisible()
  })

  test('shows navigation items when empty', async ({ page }) => {
    await page.keyboard.press('Meta+k')
    const palette = page.locator('[data-testid="command-palette"]')
    await expect(palette.getByText('Dashboard')).toBeVisible()
    await expect(palette.getByText('Workshop')).toBeVisible()
    await expect(palette.getByText('Chat')).toBeVisible()
  })

  test('filters results by search query', async ({ page }) => {
    await page.keyboard.press('Meta+k')
    await page.keyboard.type('chat')
    const palette = page.locator('[data-testid="command-palette"]')
    await expect(palette.getByText('Chat')).toBeVisible()
    await expect(palette.getByText('Dashboard')).not.toBeVisible()
  })

  test('navigates to page on click', async ({ page }) => {
    await page.keyboard.press('Meta+k')
    await page.locator('[data-testid="command-palette"]').getByText('Workshop').click()
    await expect(page.locator('[data-testid="workshop-page"]')).toBeVisible()
    await expect(page.locator('[data-testid="command-palette"]')).not.toBeVisible()
  })

  test('navigates with keyboard Enter', async ({ page }) => {
    await page.keyboard.press('Meta+k')
    // ArrowDown to select second item (Workshop), then Enter
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await expect(page.locator('[data-testid="workshop-page"]')).toBeVisible()
  })
})
