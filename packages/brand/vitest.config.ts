import { defineConfig } from 'vitest/config'

/**
 * This package owns its own test run, so `turbo run test` can hash and cache it
 * against its own sources — and so a change here invalidates the packages that
 * consume it, which the root config could not express.
 *
 * No enforced threshold yet: pack-smoke-helpers sits at 90%, and raising it is its
 * own change rather than something to smuggle in behind a flag.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['src/**/*.ts', 'scripts/**/*.ts'],
      exclude: ['**/*.test.ts'],
    },
  },
})
