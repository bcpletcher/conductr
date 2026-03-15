import { test, expect } from './fixtures'

test.describe('Providers page', () => {
  test.beforeEach(async ({ page }) => {
    await page.click('[data-testid="nav-providers"]')
    await expect(page.locator('[data-testid="providers-page"]')).toBeVisible()
  })

  test('renders AI Providers heading', async ({ page }) => {
    await expect(
      page.locator('[data-testid="providers-page"]').getByRole('heading', { name: 'AI Providers' })
    ).toBeVisible()
  })

  test('shows Anthropic provider card', async ({ page }) => {
    await expect(
      page.locator('[data-testid="providers-page"]').getByText('Anthropic', { exact: true }).first()
    ).toBeVisible()
  })

  test('shows OpenRouter provider card', async ({ page }) => {
    await expect(
      page.locator('[data-testid="providers-page"]').getByText('OpenRouter', { exact: true }).first()
    ).toBeVisible()
  })

  test('shows Ollama provider card', async ({ page }) => {
    await expect(
      page.locator('[data-testid="providers-page"]').getByText('Ollama', { exact: true }).first()
    ).toBeVisible()
  })

  test('shows summary strip with connected count label', async ({ page }) => {
    // Summary strip always renders a "Connected" label for the stat
    await expect(
      page.locator('[data-testid="providers-page"]').getByText('Connected', { exact: true }).first()
    ).toBeVisible()
  })
})
