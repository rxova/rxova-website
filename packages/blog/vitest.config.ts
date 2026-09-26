import { unitConfig } from '@rxova/repo-tooling/vitest'

// The render test runs a real `astro build`, which outlasts the default timeout on a cold runner.
export default unitConfig({
  include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
  coverage: ['src/lib/**/*.ts'],
  testTimeout: 60_000,
})
