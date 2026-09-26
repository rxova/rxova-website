import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      // The CLI and the build orchestration shell out to pnpm and git; the rules they apply are unit-tested.
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/lock/cli.ts', 'src/lock/build.ts'],
      thresholds: { perFile: true, statements: 95, branches: 95, functions: 95, lines: 95 },
    },
  },
})
