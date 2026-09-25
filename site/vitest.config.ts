import { defineConfig } from 'vitest/config'

/**
 * The landing's own tests: the project walkthroughs. Each project's `after`
 * code is a real module, and these run it, so what the landing shows is what
 * was tested — see src/showcases/showcases.test.ts.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    // journey's walkthrough waits out a real 5s step timeout.
    testTimeout: 15_000,
  },
})
