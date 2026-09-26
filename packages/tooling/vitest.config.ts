import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      // Orchestration that shells out to pnpm, git and a server is covered by running it; its rules are unit-tested.
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/lock/cli.ts', 'src/lock/build.ts', 'src/e2e/**'],
      thresholds: { perFile: true, statements: 95, branches: 95, functions: 95, lines: 95 },
    },
  },
})
