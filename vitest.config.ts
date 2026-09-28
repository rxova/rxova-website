import { baseVitestConfig } from '@rxova/repo-config/vitest'

// The repository's own scripts. Orchestration that shells out to pnpm, git and a server is
// covered by running it.
export default baseVitestConfig({
  root: import.meta.dirname,
  include: ['scripts/**/*.test.ts'],
  coverageInclude: ['scripts/**/*.ts'],
  exclude: [
    'scripts/**/*.test.ts',
    'scripts/**/*.fixtures.ts',
    'scripts/lock/cli.ts',
    'scripts/lock/build.ts',
    'scripts/e2e/**',
  ],
  reporter: ['text', 'json-summary'],
})
