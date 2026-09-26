/** The shared Playwright setup: each app's config names only its server and port. */
import { defineConfig, devices, type PlaywrightTestConfig } from '@playwright/test'

export interface E2eOptions {
  /** Starts the server the specs run against. */
  command: string
  port: number
  /** Extra projects, e.g. a local-only visual check. */
  projects?: PlaywrightTestConfig['projects']
  snapshotPathTemplate?: string
}

export function e2eConfig({ command, port, projects = [], snapshotPathTemplate }: E2eOptions) {
  const ci = Boolean(process.env.CI)
  return defineConfig({
    testDir: 'e2e',
    fullyParallel: true,
    forbidOnly: ci,
    retries: ci ? 1 : 0,
    reporter: ci ? [['github'], ['list']] : 'list',
    use: { baseURL: `http://localhost:${port}`, trace: 'retain-on-failure' },
    ...(snapshotPathTemplate ? { snapshotPathTemplate } : {}),
    projects: [
      { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: /visual\.spec/ },
      ...projects,
    ],
    webServer: {
      command,
      url: `http://localhost:${port}/`,
      timeout: 600_000,
      reuseExistingServer: !ci,
      stdout: 'pipe',
    },
  })
}

/** Serves an app's built `dist`, in the foreground, alongside any preview already running. */
export const astroPreview = (port: number) => `astro preview --port ${port} --ignore-lock`
