import { defineConfig } from 'vitest/config'

/**
 * This package owns its own test run, and its own floor.
 *
 * It is the one thing here that is *published*, and every boundary between this
 * repo and rxova-website is described by it: what a post may say, what
 * `sources.json` may contain, what a dispatch may carry. A gap in it is a gap in
 * two repos at once, and the other repo's half only surfaces at deploy time.
 *
 * So the threshold is enforced rather than reported, at 95% **per file** across all
 * four metrics. Per-file matters more than the number: a single well-covered module
 * will happily carry an untested one to a green aggregate, which is exactly the
 * reassurance nobody wants.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',

    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],

      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts'],

      thresholds: {
        perFile: true,
        statements: 95,
        branches: 95,
        functions: 95,
        lines: 95,
      },
    },
  },
})
