import { unitConfig } from '@rxova/repo-tooling/vitest'

// The screenshot driver is covered by running it; the decisions it makes are in gallery.ts.
export default unitConfig({
  include: ['scripts/**/*.test.ts'],
  coverage: ['scripts/**/*.ts'],
  exclude: ['scripts/screenshots.ts'],
  thresholds: { perFile: true, statements: 95, branches: 95, functions: 95, lines: 95 },
})
