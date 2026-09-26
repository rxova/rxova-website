import { resolve } from 'node:path'

import { devices } from '@playwright/test'
import { e2eConfig } from '@rxova/repo-tooling/playwright'

// The assembled site, built and composed the way the deploy does it.
export default e2eConfig({
  command: 'pnpm --filter @rxova/repo-tooling serve:site',
  port: 4480,
  // Screenshots are compared locally only (`pnpm visual`); font rendering differs across machines.
  snapshotPathTemplate: `${resolve(import.meta.dirname, '../..')}/.lock/visual/{arg}{ext}`,
  projects: [{ name: 'visual', use: { ...devices['Desktop Chrome'] }, testMatch: /visual\.spec/ }],
})
