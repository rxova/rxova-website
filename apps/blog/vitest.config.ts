import { unitConfig } from '@rxova/repo-tooling/vitest'

// The render test runs a real `astro build`, which outlasts the default timeout on a cold runner.
// content.ts reads `astro:content`, which only an Astro build can resolve.
export default unitConfig({
  include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
  coverage: ['src/lib/**/*.ts'],
  exclude: ['src/lib/content.ts'],
  thresholds: { perFile: true, statements: 95, branches: 95, functions: 95, lines: 95 },
  testTimeout: 60_000,
})
