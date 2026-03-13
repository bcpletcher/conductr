import { test, expect } from './fixtures'

test.describe('Workshop', () => {
  test.beforeEach(async ({ page }) => {
    await page.click('[data-testid="nav-workshop"]')
    await expect(page.locator('[data-testid="workshop-page"]')).toBeVisible()
  })

  test('shows tab bar with queued, active, complete', async ({ page }) => {
    for (const tab of ['queued', 'active', 'complete']) {
      await expect(page.getByText(new RegExp(`${tab}\\s*\\(`, 'i'))).toBeVisible()
    }
  })

  test('opens new task modal', async ({ page }) => {
    await page.click('text=+ New Task')
    const modal = page.locator('[data-testid="modal-overlay"]')
    await expect(modal).toBeVisible()
    // Scope to modal heading to avoid matching the "New Task" button also on the page
    await expect(modal.getByRole('heading', { name: 'New Task' })).toBeVisible()
  })

  test('creates a task via the modal form', async ({ page }) => {
    await page.click('text=+ New Task')
    await page.fill('input[placeholder="Task title"]', 'E2E Test Task')
    await page.click('text=Queue Task')
    // Modal should close
    await expect(page.locator('[data-testid="modal-overlay"]')).not.toBeVisible()
    // Task should appear in the list (use .first() since prior runs may have left duplicates in DB)
    await expect(page.locator('[data-testid="task-card"]').getByText('E2E Test Task').first()).toBeVisible()
  })

  test('view toggle switches between list and board views', async ({ page }) => {
    // Default is list — tab bar visible, board view hidden
    await expect(page.locator('[data-testid="view-toggle-list"]')).toBeVisible()
    await expect(page.locator('[data-testid="view-toggle-board"]')).toBeVisible()
    await expect(page.locator('[data-testid="board-view"]')).not.toBeVisible()

    // Switch to board view
    await page.click('[data-testid="view-toggle-board"]')
    await expect(page.locator('[data-testid="board-view"]')).toBeVisible()

    // Tab bar should be hidden in board mode
    await expect(page.getByText(/queued\s*\(/i)).not.toBeVisible()

    // Switch back to list
    await page.click('[data-testid="view-toggle-list"]')
    await expect(page.locator('[data-testid="board-view"]')).not.toBeVisible()
    await expect(page.getByText(/queued\s*\(/i)).toBeVisible()
  })

  test('board view shows all four column headings', async ({ page }) => {
    await page.click('[data-testid="view-toggle-board"]')
    await expect(page.locator('[data-testid="board-view"]')).toBeVisible()
    for (const col of ['Queued', 'Active', 'Complete', 'Failed']) {
      await expect(page.locator('[data-testid="board-view"]').getByText(col).first()).toBeVisible()
    }
  })
})
