import { unitConfig } from '@rxova/repo-tooling/vitest'

// journey's walkthrough waits out a real 5s step timeout.
export default unitConfig({
  coverage: ['src/lib/**/*.ts'],
  thresholds: { perFile: true, statements: 90, branches: 90, functions: 90, lines: 90 },
  testTimeout: 15_000,
})
