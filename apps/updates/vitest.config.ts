import { unitConfig } from '@rxova/repo-tooling/vitest'

// content.ts reads `astro:content`, which only an Astro build can resolve.
export default unitConfig({
  coverage: ['src/lib/**/*.ts'],
  exclude: ['src/lib/content.ts'],
  thresholds: { perFile: true, statements: 95, branches: 95, functions: 95, lines: 95 },
})
