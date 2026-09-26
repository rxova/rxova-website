import { defineConfig } from 'vitest/config'

/**
 * This published package enforces 95% coverage **per file** on all four metrics, so a
 * well-covered module cannot carry an untested one to a green aggregate.
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
