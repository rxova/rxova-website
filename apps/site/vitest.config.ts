import { unitConfig } from '@rxova/repo-tooling/vitest'

// journey's walkthrough waits 5s and test/blog-render.test.ts runs a real `astro build`.
// blog.ts, updates.ts and authors.ts read `astro:content`, which only an Astro build resolves.
export default unitConfig({
  include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
  coverage: ['src/lib/**/*.ts'],
  exclude: ['src/lib/blog.ts', 'src/lib/updates.ts', 'src/lib/authors.ts'],
  thresholds: { perFile: true, statements: 90, branches: 90, functions: 90, lines: 90 },
  testTimeout: 60_000,
})
