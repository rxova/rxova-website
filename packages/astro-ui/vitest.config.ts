import { unitConfig } from '@rxova/repo-tooling/vitest'

// Tests live in test/, which the tarball's `files` leaves out.
export default unitConfig({
  include: ['test/**/*.test.ts'],
  coverage: ['src/**/*.ts'],
  thresholds: { perFile: true, statements: 95, branches: 95, functions: 95, lines: 95 },
})
