import { test, expect } from './fixtures'

test.describe('Settings page', () => {
  test.beforeEach(async ({ page }) => {
    await page.click('[data-testid="nav-settings"]')
    await expect(page.locator('[data-testid="page-settings"]')).toBeAttached()
  })

  test('shows settings heading', async ({ page }) => {
    await expect(page.locator('[data-testid="page-settings"] h1')).toHaveText('Settings')
  })

  test('shows wallpaper brightness slider when an image wallpaper is selected', async ({ page }) => {
    // Ensure an image preset is active so the slider is rendered
    await page.click('[data-testid="wallpaper-preset-default"]')
    const slider = page.locator('[data-testid="brightness-slider"]')
    await expect(slider).toBeVisible()
  })

  test('brightness value label updates when slider changes', async ({ page }) => {
    // Ensure the default image preset is active (slider only shows for image wallpapers)
    await page.click('[data-testid="wallpaper-preset-default"]')
    const slider = page.locator('[data-testid="brightness-slider"]')
    const label  = page.locator('[data-testid="brightness-value"]')

    // Set slider to 0 → expect 0%
    await slider.fill('0')
    await expect(label).toHaveText('0%')

    // Set slider to 1 → expect 100%
    await slider.fill('1')
    await expect(label).toHaveText('100%')
  })

  test('shows app info in about section', async ({ page }) => {
    const settings = page.locator('[data-testid="page-settings"]')
    await expect(settings.getByText('claude-sonnet-4-6')).toBeVisible()
    await expect(settings.getByText('Electron · React · SQLite')).toBeVisible()
  })

  test('shows wallpaper preset swatches', async ({ page }) => {
    await expect(page.locator('[data-testid="wallpaper-presets"]')).toBeVisible()
    // 2 image presets (none + default) + 1 custom upload slot
    await expect(page.locator('[data-testid^="wallpaper-preset-"]')).toHaveCount(2)
    await expect(page.locator('[data-testid="wallpaper-custom-btn"]')).toBeVisible()
  })

  test('clicking a wallpaper preset marks it active', async ({ page }) => {
    // Click the Default (wallpaper.png) preset
    await page.click('[data-testid="wallpaper-preset-default"]')
    // Active preset gets a white border
    const defaultPreset = page.locator('[data-testid="wallpaper-preset-default"]')
    const border = await defaultPreset.evaluate((el) => (el as HTMLElement).style.border)
    expect(border).toContain('rgba(255, 255, 255')
  })

  test('shows accent color swatches', async ({ page }) => {
    await expect(page.locator('[data-testid="accent-swatches"]')).toBeVisible()
    // 6 swatches
    await expect(page.locator('[data-testid^="accent-swatch-"]')).toHaveCount(6)
  })

  test('clicking an accent swatch marks it selected', async ({ page }) => {
    // Click Violet swatch
    await page.click('[data-testid="accent-swatch-violet"]')
    // The violet swatch should now have border: 2px solid #fff (selected state)
    const swatch = page.locator('[data-testid="accent-swatch-violet"]')
    const border = await swatch.evaluate((el) => (el as HTMLElement).style.border)
    expect(border).toContain('rgb(255, 255, 255)')
  })

  test('shows density toggle with comfortable and compact options', async ({ page }) => {
    await expect(page.locator('[data-testid="density-toggle"]')).toBeVisible()
    await expect(page.locator('[data-testid="density-comfortable"]')).toBeVisible()
    await expect(page.locator('[data-testid="density-compact"]')).toBeVisible()
  })

  test('clicking compact applies data-density attribute', async ({ page }) => {
    await page.click('[data-testid="density-compact"]')
    const attr = await page.evaluate(() =>
      document.documentElement.getAttribute('data-density')
    )
    expect(attr).toBe('compact')
  })

  test('clicking comfortable restores default density', async ({ page }) => {
    // Set compact first, then restore
    await page.click('[data-testid="density-compact"]')
    await page.click('[data-testid="density-comfortable"]')
    const attr = await page.evaluate(() =>
      document.documentElement.getAttribute('data-density')
    )
    expect(attr).toBe('comfortable')
  })
})

test.describe('Workshop N shortcut', () => {
  test.beforeEach(async ({ page }) => {
    await page.click('[data-testid="nav-workshop"]')
    await expect(page.locator('[data-testid="workshop-page"]')).toBeVisible()
  })

  test('N key opens new task modal', async ({ page }) => {
    // Ensure no input is focused
    await page.locator('body').click()
    await page.keyboard.press('n')
    await expect(page.getByRole('heading', { name: 'New Task' }).first()).toBeVisible()
  })

  test('N key is ignored when input is focused', async ({ page }) => {
    // Click inside the search/filter input if present; otherwise the title input of the modal
    // To simulate: open modal first via button, then press N — it should not open a second modal
    await page.click('text=+ New Task')
    const modal = page.locator('[data-testid="modal-overlay"]')
    await expect(modal).toBeVisible()
    // Focus a text input inside the modal
    const titleInput = modal.locator('input').first()
    await titleInput.click()
    await page.keyboard.press('n')
    // Still just one modal (N did not re-trigger)
    await expect(page.locator('[data-testid="modal-overlay"]')).toHaveCount(1)
  })
})
