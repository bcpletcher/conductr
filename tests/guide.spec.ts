import { test, expect } from './fixtures'

test.describe('Guide page', () => {
  test.beforeEach(async ({ page }) => {
    await page.click('[data-testid="nav-guide"]')
    await expect(page.locator('[data-testid="guide-page"]')).toBeVisible()
  })

  test('shows Guide heading', async ({ page }) => {
    await expect(page.locator('[data-testid="guide-page"] h1')).toHaveText('Guide')
  })

  test('has all 5 tab buttons visible', async ({ page }) => {
    const guide = page.locator('[data-testid="guide-page"]')
    for (const tab of ['Getting Started', 'Features', 'Agent System', 'Advanced', 'Reference']) {
      await expect(guide.getByText(tab).first()).toBeVisible()
    }
  })

  test('Getting Started tab shows mode setup cards', async ({ page }) => {
    await page.locator('[data-testid="guide-page"]').getByText('Getting Started').first().click()
    await expect(page.locator('[data-testid="guide-page"]').getByText('Claude Code Mode').first()).toBeVisible()
    await expect(page.locator('[data-testid="guide-page"]').getByText('API Key Mode').first()).toBeVisible()
  })

  test('Features tab shows core feature sections', async ({ page }) => {
    await page.locator('[data-testid="guide-page"]').getByText('Features').first().click()
    const guide = page.locator('[data-testid="guide-page"]')
    await expect(guide.getByText('Workshop').first()).toBeVisible()
    await expect(guide.getByText('Chat').first()).toBeVisible()
  })

  test('Agent System tab lists all 11 agents by name', async ({ page }) => {
    await page.locator('[data-testid="guide-page"]').getByText('Agent System').first().click()
    const guide = page.locator('[data-testid="guide-page"]')
    for (const name of ['Lyra', 'Nova', 'Scout', 'Forge', 'Pixel', 'Sentinel', 'Courier', 'Nexus', 'Helm', 'Atlas', 'Ledger']) {
      await expect(guide.getByText(name).first()).toBeVisible()
    }
  })

  test('Advanced tab shows Pipelines and Channels sections', async ({ page }) => {
    await page.locator('[data-testid="guide-page"]').getByText('Advanced').first().click()
    const guide = page.locator('[data-testid="guide-page"]')
    await expect(guide.getByText('Pipelines').first()).toBeVisible()
    await expect(guide.getByText('OpenClaw').first()).toBeVisible()
  })

  test('Reference tab shows keyboard shortcut rows', async ({ page }) => {
    await page.locator('[data-testid="guide-page"]').getByText('Reference').first().click()
    const guide = page.locator('[data-testid="guide-page"]')
    await expect(guide.getByText('Global Keyboard Shortcuts')).toBeVisible()
    await expect(guide.getByText('Open Command Palette')).toBeVisible()
  })

  test('Reference tab shows Settings Overview section', async ({ page }) => {
    await page.locator('[data-testid="guide-page"]').getByText('Reference').first().click()
    await expect(page.locator('[data-testid="guide-page"]').getByText('Settings Overview')).toBeVisible()
  })

  test('switching tabs scrolls content back to top', async ({ page }) => {
    await page.locator('[data-testid="guide-page"]').getByText('Features').first().click()
    // Scroll content down
    await page.evaluate(() => {
      const scrollable = document.querySelector('[data-testid="guide-page"] .overflow-y-auto')
      if (scrollable) scrollable.scrollTop = 400
    })
    // Switch to a different tab
    await page.locator('[data-testid="guide-page"]').getByText('Reference').first().click()
    const top = await page.evaluate(() => {
      const scrollable = document.querySelector('[data-testid="guide-page"] .overflow-y-auto')
      return scrollable ? scrollable.scrollTop : 0
    })
    expect(top).toBe(0)
  })
})
