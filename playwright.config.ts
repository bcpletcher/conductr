import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testIgnore: ['**/*.integration.spec.ts', '**/*-integration.spec.ts'],
  timeout: 30000,
  expect: { timeout: 5000 },
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    trace: 'on-first-retry'
  }
})
