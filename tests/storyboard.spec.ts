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

  test('shows Roadmap and Ideas in left rail', async ({ page }) => {
    const page_ = page.locator('[data-testid="blueprint-page"]')
    // Left rail has "Roadmap" section label and "Ideas" nav entry
    await expect(page_.getByText('Roadmap').first()).toBeVisible()
    await expect(page_.getByText('Ideas').first()).toBeVisible()
  })

  test('shows phase navigation in left rail by default', async ({ page }) => {
    // The left rail phase sections should be visible
    await expect(
      page.locator('[data-testid="blueprint-page"]').getByText('In Progress')
        .or(page.locator('[data-testid="blueprint-page"]').getByText('Planned'))
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

  test('clicking Ideas rail entry switches to kanban view', async ({ page }) => {
    // Click the Ideas rail button (contains "Proposals" sub-label)
    await page.locator('[data-testid="blueprint-page"]').getByText('Proposals').click()
    // Kanban columns should be visible
    await expect(
      page.locator('[data-testid="blueprint-page"]').getByText('Open')
        .or(page.locator('[data-testid="blueprint-page"]').getByText('Pinned'))
        .first()
    ).toBeVisible()
  })
})
