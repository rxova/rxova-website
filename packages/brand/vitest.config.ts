import { unitConfig } from '@rxova/repo-tooling/vitest'

// generate-og.ts and pack-smoke.ts are command-line entry points, run by `pnpm og`,
// `check:og` and `pack:smoke`; pack-smoke's logic is covered through its helpers.
// New tests go in test/, which the tarball's `files` leaves out.
export default unitConfig({
  include: ['src/**/*.test.ts', 'scripts/**/*.test.ts', 'test/**/*.test.ts'],
  coverage: ['src/**/*.ts', 'scripts/**/*.ts'],
  exclude: ['scripts/generate-og.ts', 'scripts/pack-smoke.ts'],
  thresholds: { perFile: true, statements: 95, branches: 95, functions: 95, lines: 95 },
})
