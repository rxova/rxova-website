import { resolve } from 'node:path'

import { defineConfig, devices } from '@playwright/test'

const port = Number(process.env.PORT ?? 4480)
const repoRoot = resolve(import.meta.dirname, '../..')

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: { baseURL: `http://localhost:${port}`, trace: 'retain-on-failure' },
  // Screenshots are compared locally only (`pnpm visual`); font rendering differs across machines.
  snapshotPathTemplate: `${repoRoot}/.lock/visual/{arg}-{projectName}{ext}`,
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: /visual\.spec/ },
    { name: 'visual', use: { ...devices['Desktop Chrome'] }, testMatch: /visual\.spec/ },
  ],
  webServer: {
    command: 'node src/e2e/serve.ts',
    url: `http://localhost:${port}/`,
    timeout: 600_000,
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
  },
})
