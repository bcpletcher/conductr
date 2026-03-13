import { test, expect } from './fixtures'

test.describe('Clients', () => {
  test.beforeEach(async ({ page }) => {
    await page.click('[data-testid="nav-clients"]')
    await expect(page.locator('[data-testid="clients-page"]')).toBeVisible()
  })

  test('shows page heading', async ({ page }) => {
    await expect(
      page.locator('[data-testid="clients-page"]')
        .getByRole('heading', { name: 'Clients' })
    ).toBeVisible()
  })

  test('new client button is present', async ({ page }) => {
    await expect(page.getByRole('button', { name: /new client/i })).toBeVisible()
  })

  test('shows client list panel', async ({ page }) => {
    await expect(page.locator('[data-testid="client-list"]').first()).toBeVisible()
  })

  test('can create a new client', async ({ page }) => {
    await page.click('[data-testid="clients-page"] button:has-text("+ New Client")')
    await page.fill('input[placeholder="e.g. Acme Corp"]', 'Test Client Corp')
    await page.fill('textarea[placeholder*="description"]', 'A test client')
    await page.click('button:has-text("Create Client")')
    await expect(page.getByText('Test Client Corp').first()).toBeVisible()
  })
})
