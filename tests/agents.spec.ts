import { test, expect } from './fixtures'

test.describe('Agents', () => {
  test.beforeEach(async ({ page }) => {
    await page.click('[data-testid="nav-agents"]')
    await expect(page.locator('[data-testid="agents-page"]')).toBeVisible()
  })

  test('Lyra agent is pre-seeded and visible', async ({ page }) => {
    // Use h3 to scope to the agent list sidebar item specifically
    await expect(page.getByRole('heading', { name: 'Lyra', level: 3 })).toBeVisible()
  })

  test('agent detail shows when selected', async ({ page }) => {
    // Lyra should auto-select as first agent — either section label is present
    await expect(
      page.getByText('Mission Directives').or(page.getByText('Operational Bio')).first()
    ).toBeVisible()
  })

  test('all 11 agents are seeded and visible in the roster', async ({ page }) => {
    const expectedAgents = ['Lyra', 'Nova', 'Scout', 'Forge', 'Pixel', 'Sentinel', 'Courier', 'Nexus', 'Helm', 'Atlas', 'Ledger']
    for (const name of expectedAgents) {
      await expect(page.getByRole('heading', { name, level: 3 })).toBeVisible()
    }
  })

  test('clicking each agent shows their detail panel', async ({ page }) => {
    const agents = ['Lyra', 'Forge', 'Scout', 'Pixel', 'Sentinel']
    for (const name of agents) {
      await page.getByRole('heading', { name, level: 3 }).click()
      // After selecting, the detail panel should show Mission Directives or Operational Bio
      await expect(
        page.getByText('Mission Directives').or(page.getByText('Operational Bio')).first()
      ).toBeVisible()
    }
  })

  test('Protocol tab is accessible', async ({ page }) => {
    await page.click('[data-testid="agents-page"] button:has-text("Protocol")')
    await expect(
      page.getByText('Org Chart').or(page.getByText('Budget').or(page.getByText('Protocol'))).first()
    ).toBeVisible()
  })

  test('Comms tab is accessible', async ({ page }) => {
    await page.click('[data-testid="agents-page"] button:has-text("Comms")')
    await expect(
      page.getByText('Channels').or(page.getByText('Direct').or(page.getByText('Comms'))).first()
    ).toBeVisible()
  })

  test('Files sub-tab shows agent file editor for Lyra', async ({ page }) => {
    // Lyra should be auto-selected; click the Files sub-tab
    await page.click('[data-testid="agents-page"] button:has-text("Files")')
    // Should show at least one agent file (SOUL.md, IDENTITY.md, etc.)
    await expect(
      page.getByText('SOUL.md').or(page.getByText('IDENTITY.md')).or(page.getByText('MEMORY.md')).first()
    ).toBeVisible()
  })
})
