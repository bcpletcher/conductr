import { test, expect } from './fixtures'

const NAV_PAGES = [
  { id: 'dashboard', title: 'Dashboard' },
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
      // Use heading role to avoid matching text that appears in body/stub content
      await expect(pageEl.getByRole('heading', { name: title })).toBeVisible()
    })
  }
})
