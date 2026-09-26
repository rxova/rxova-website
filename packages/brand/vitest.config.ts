import { unitConfig } from '@rxova/repo-tooling/vitest'

// New tests go in test/, which the tarball's `files` leaves out.
export default unitConfig({
  include: ['src/**/*.test.ts', 'scripts/**/*.test.ts', 'test/**/*.test.ts'],
  coverage: ['src/**/*.ts', 'scripts/**/*.ts'],
})
