import { test as base, type ElectronApplication, type Page } from '@playwright/test'
import { _electron as electron } from 'playwright'
import path from 'path'

type Fixtures = {
  electronApp: ElectronApplication
  page: Page
}

export const test = base.extend<Fixtures>({
  electronApp: async ({}, use) => {
    const app = await electron.launch({
      args: [path.join(__dirname, '..', 'out', 'main', 'index.js')],
      env: { ...process.env, NODE_ENV: 'test' }
    })
    await use(app)
    await app.close()
  },

  page: async ({ electronApp }, use) => {
    const window = await electronApp.firstWindow()
    // Wait for React to mount
    await window.waitForSelector('[data-testid="sidebar"]', { timeout: 10000 })
    await use(window)
  }
})

export { expect } from '@playwright/test'
