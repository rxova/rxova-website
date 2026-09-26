import { unitConfig } from './config/vitest.ts'

const floor = { perFile: true, statements: 95, branches: 95, functions: 95, lines: 95 }

export default unitConfig({
  // Orchestration that shells out to pnpm, git and a server is covered by running it.
  exclude: ['src/lock/cli.ts', 'src/lock/build.ts', 'src/e2e/**'],
  thresholds: {
    'src/lock/**': floor,
    'src/lib/**': floor,
    'src/deploy/**': floor,
    'src/repo/**': floor,
  },
})
