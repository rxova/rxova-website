import { unitConfig } from './config/vitest.ts'

export default unitConfig({
  // Orchestration that shells out to pnpm, git and a server is covered by running it.
  exclude: ['src/lock/cli.ts', 'src/lock/build.ts', 'src/e2e/**'],
  // Enforced for the lock so far; the deploy and repo scripts get their floor with their tests.
  thresholds: {
    'src/lock/**': { perFile: true, statements: 95, branches: 95, functions: 95, lines: 95 },
  },
})
