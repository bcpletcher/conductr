import { test, expect } from './fixtures'

const NAV_PAGES = [
  { id: 'dashboard', title: 'Mission Control' },
  { id: 'journal', title: 'Journal' },
  { id: 'documents', title: 'Documents' },
  { id: 'agents', title: 'Agents' },
  { id: 'intelligence', title: 'Intelligence' },
  { id: 'workshop', title: 'Workshop' },
  { id: 'clients', title: 'Clients' },
  { id: 'metrics', title: 'API Usage & Metrics' }
]

test.describe('Navigation', () => {
  for (const { id, title } of NAV_PAGES) {
    test(`navigates to ${id} page`, async ({ page }) => {
      await page.click(`[data-testid="nav-${id}"]`)
      const pageEl = page.locator(`[data-testid="${id}-page"]`)
      await expect(pageEl).toBeVisible()
      await expect(pageEl.getByText(title)).toBeVisible()
    })
  }
})
