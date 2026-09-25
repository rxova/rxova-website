import { defineConfig } from 'vitest/config'

/**
 * The root run covers `scripts/`, which is not a package: the aggregator's
 * tooling (the registry, the ingest gate, the deploy-time fetch and the
 * assembler) and the repo tooling (the release gate, the changeset check and the
 * content validator).
 *
 * Every package under `packages/` owns a vitest config and a `test` script,
 * reached through `turbo run test`. Collecting them here as well would run them
 * twice under a config that is not theirs.
 */
export default defineConfig({
  test: {
    include: ['scripts/**/*.test.{mjs,ts}'],
    exclude: ['**/node_modules/**', 'packages/**', 'apps/**', 'site/**'],
    // Node, not jsdom: most of what is under test shells out to git and pnpm.
    environment: 'node',
    // The changeset tests spawn a real process against a temp git repo, which
    // is comfortably slower than the 5s default on a cold runner.
    testTimeout: 30_000,

    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],

      /**
       * Coverage is REPORTED, not enforced. Deliberate, and temporary.
       *
       * The intended gate is 95% per file, and switching it on now would make the
       * pipeline's health depend on a hardening pass that has not happened:
       *
       *   scripts/assemble.mjs         88% stmts · 69% branches
       *   scripts/registry.mjs         93% branches — nearly there
       *   scripts/ingest.mjs           65% stmts · 76% branches
       *   scripts/fetch-docs.mjs       15% stmts — shells out to `gh`
       *   scripts/check-registry.mjs    0% — a thin CLI over registry.mjs
       *   scripts/check-changeset.ts    0% — its tests spawn a real process, so
       *                                   in-process v8 sees nothing
       *
       * Re-enabling is one edit: uncomment `thresholds` below, in the same change
       * that closes the gap, so the gate goes green on its first run.
       *
       * .astro and CSS stay out regardless: `astro check`, `publint`, the pack
       * smoke test and the builds are what guard them.
       */
      all: true,
      include: ['scripts/*.{mjs,ts}'],
      exclude: ['**/*.test.*'],
      // thresholds: {
      //   perFile: true,
      //   statements: 95,
      //   branches: 95,
      //   functions: 95,
      //   lines: 95,
      // },
    },
  },
})
