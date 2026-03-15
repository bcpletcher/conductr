import { test, expect } from './fixtures'

test.describe('Storyboard page', () => {
  test.beforeEach(async ({ page }) => {
    await page.click('[data-testid="nav-blueprint"]')
    await expect(page.locator('[data-testid="blueprint-page"]')).toBeVisible()
  })

  test('renders Storyboard heading', async ({ page }) => {
    await expect(
      page.locator('[data-testid="blueprint-page"]').getByRole('heading', { name: 'Storyboard' })
    ).toBeVisible()
  })

  test('shows Roadmap and Ideas tabs', async ({ page }) => {
    const page_ = page.locator('[data-testid="blueprint-page"]')
    await expect(page_.getByText('Roadmap')).toBeVisible()
    await expect(page_.getByText('Ideas')).toBeVisible()
  })

  test('Roadmap tab is active by default', async ({ page }) => {
    // The phase list (left rail) should be visible
    await expect(
      page.locator('[data-testid="blueprint-page"]').getByText('Phases')
        .or(page.locator('[data-testid="blueprint-page"]').getByText('In Progress'))
        .first()
    ).toBeVisible()
  })

  test('shows phase progress stats', async ({ page }) => {
    const container = page.locator('[data-testid="blueprint-page"]')
    // Summary bar has Done / Active / Planned labels
    await expect(container.getByText('Done').first()).toBeVisible()
    await expect(container.getByText('Active').first()).toBeVisible()
    await expect(container.getByText('Planned').first()).toBeVisible()
  })

  test('clicking Ideas tab switches to kanban view', async ({ page }) => {
    await page.locator('[data-testid="blueprint-page"]').getByText('Ideas').click()
    // Kanban columns should be visible
    await expect(
      page.locator('[data-testid="blueprint-page"]').getByText('Open')
        .or(page.locator('[data-testid="blueprint-page"]').getByText('Pinned'))
        .first()
    ).toBeVisible()
  })
})
