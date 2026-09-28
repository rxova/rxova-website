import { baseVitestConfig } from '@rxova/repo-config/vitest'

// The screenshot driver is covered by running it; the decisions it makes are in gallery.ts.
export default baseVitestConfig({
  root: import.meta.dirname,
  include: ['scripts/**/*.test.ts'],
  coverageInclude: ['scripts/**/*.ts'],
  exclude: ['scripts/**/*.test.ts', 'scripts/screenshots.ts'],
  reporter: ['text', 'json-summary'],
})
