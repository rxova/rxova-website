import { defineConfig } from 'vitest/config'

/**
 * This package owns its own test run, so `turbo run test` hashes it against its own
 * sources and its own prose — and so a change in @rxova/website-schemas or @rxova/brand
 * invalidates it, which the root config could not express.
 *
 * No enforced threshold: most of this package is .astro markup, which carries no
 * branches a unit test can reach. `astro check` and the build are what guard that.
 * What is tested is the logic — ordering and formatting — and the prose itself.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['src/lib/**/*.ts'],
      exclude: ['**/*.test.ts'],
    },
  },
})
