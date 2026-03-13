import { test, expect } from './fixtures'

test.describe('Documents', () => {
  test.beforeEach(async ({ page }) => {
    await page.click('[data-testid="nav-documents"]')
    await expect(page.locator('[data-testid="documents-page"]')).toBeVisible()
  })

  test('shows page heading', async ({ page }) => {
    await expect(
      page.locator('[data-testid="documents-page"]')
        .getByRole('heading', { name: 'Documents' })
    ).toBeVisible()
  })

  test('shows document list panel', async ({ page }) => {
    await expect(page.locator('[data-testid="document-list"]').first()).toBeVisible()
  })

  test('search input is present', async ({ page }) => {
    await expect(page.locator('[data-testid="documents-search"]')).toBeVisible()
  })

  test('select panel shows placeholder when nothing selected', async ({ page }) => {
    await expect(page.getByText('Select a document to preview').first()).toBeVisible()
  })
})
