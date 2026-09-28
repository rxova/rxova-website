import { baseVitestConfig } from '@rxova/repo-config/vitest'

// generate-og.ts is a CLI entry point. New tests go in test/, which the tarball's `files` leaves out.
export default baseVitestConfig({
  root: import.meta.dirname,
  include: ['src/**/*.test.ts', 'scripts/**/*.test.ts', 'test/**/*.test.ts'],
  coverageInclude: ['src/**/*.ts', 'scripts/**/*.ts'],
  exclude: ['scripts/**/*.test.ts', 'scripts/generate-og.ts'],
  reporter: ['text', 'json-summary'],
})
