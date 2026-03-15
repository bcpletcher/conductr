import { test, expect } from './fixtures'

test.describe('Pipelines page', () => {
  test.beforeEach(async ({ page }) => {
    await page.click('[data-testid="nav-pipelines"]')
    await expect(page.locator('[data-testid="page-pipelines"]')).toBeVisible({ timeout: 5000 })
  })

  test('renders Pipelines heading', async ({ page }) => {
    const container = page.locator('[data-testid="page-pipelines"]')
    await expect(container.getByRole('heading', { name: 'Pipelines' })).toBeVisible()
  })

  test('shows Builder, Swarm Mode, and Runs tabs', async ({ page }) => {
    const container = page.locator('[data-testid="page-pipelines"]')
    await expect(container.getByText('Builder')).toBeVisible()
    await expect(container.getByText('Swarm Mode')).toBeVisible()
    await expect(container.getByText('Runs')).toBeVisible()
  })

  test('Builder tab shows built-in templates', async ({ page }) => {
    const container = page.locator('[data-testid="page-pipelines"]')
    // Section heading for templates
    await expect(container.getByText('Built-in Templates')).toBeVisible()
    // At least one template name should be visible
    await expect(
      container.getByText('Jira → PR').or(container.getByText('Daily Briefing')).first()
    ).toBeVisible({ timeout: 5000 })
  })

  test('selecting a template shows step detail', async ({ page }) => {
    const container = page.locator('[data-testid="page-pipelines"]')
    // Click the first template
    const firstTemplate = container.getByText('Jira → PR')
    await expect(firstTemplate).toBeVisible({ timeout: 5000 })
    await firstTemplate.click()
    // Right panel should show a Run Pipeline button
    await expect(container.getByText('Run Pipeline')).toBeVisible()
  })

  test('Swarm Mode tab renders goal input', async ({ page }) => {
    const container = page.locator('[data-testid="page-pipelines"]')
    await container.getByText('Swarm Mode').click()
    await expect(container.getByText('Swarm Mode').first()).toBeVisible()
    // Should show textarea placeholder
    await expect(container.getByPlaceholder(/Describe your goal/)).toBeVisible()
  })

  test('Swarm Mode has Preview Plan and Launch Swarm buttons', async ({ page }) => {
    const container = page.locator('[data-testid="page-pipelines"]')
    await container.getByText('Swarm Mode').click()
    await expect(container.getByText('Preview Plan')).toBeVisible()
    await expect(container.getByText('Launch Swarm')).toBeVisible()
  })

  test('Runs tab renders empty state when no runs exist', async ({ page }) => {
    const container = page.locator('[data-testid="page-pipelines"]')
    await container.getByText('Runs').click()
    await expect(
      container.getByText('Recent Runs').or(container.getByText('No runs yet')).first()
    ).toBeVisible()
  })

  test('My Pipelines section has a New button', async ({ page }) => {
    const container = page.locator('[data-testid="page-pipelines"]')
    await expect(container.getByText('My Pipelines')).toBeVisible()
    await expect(container.getByText('+ New')).toBeVisible()
  })
})
