import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.integration.spec.ts',
  timeout: 120000,
  expect: { timeout: 90000 },
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    trace: 'on-first-retry'
  }
})
