import { baseVitestConfig } from '@rxova/repo-config/vitest'

// journey's walkthrough waits 5s and test/blog-render.test.ts runs a real `astro build`.
// blog.ts, updates.ts and authors.ts read `astro:content`, which only an Astro build resolves.
export default baseVitestConfig({
  root: import.meta.dirname,
  include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
  coverageInclude: ['src/lib/**/*.ts'],
  exclude: ['src/lib/blog.ts', 'src/lib/updates.ts', 'src/lib/authors.ts'],
  thresholds: { statements: 90, branches: 90, functions: 90, lines: 90 },
  reporter: ['text', 'json-summary'],
  testTimeout: 60_000,
})
