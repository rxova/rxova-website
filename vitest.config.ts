import { defineConfig } from 'vitest/config'

/**
 * One runner for both halves of this repo.
 *
 * `scripts/` covers the aggregator's tooling — the registry, the ingest gate, the
 * deploy-time fetch and the assembler. `site/src/lib` covers the ordering and
 * formatting behind /blog and /updates.
 *
 * These used to run under `node --test`. They moved here because node:test has no
 * per-file coverage threshold, and a single global number lets one well-covered
 * file hide an untested one.
 */
export default defineConfig({
  test: {
    include: ['scripts/**/*.test.mjs', 'site/src/**/*.test.ts'],
    // `site/src/external` is a checkout of rxova/brand. Without this, its suite
    // runs here too — brand's tests reported as this repo's, passing or failing on
    // code this repo does not own.
    exclude: ['**/node_modules/**', 'site/src/external/**'],
    environment: 'node',

    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],

      /**
       * Coverage is REPORTED, not enforced. Deliberate, and temporary.
       *
       * The intended gate is 95% per file. `site/src/lib/entries.ts` already clears
       * it, but the aggregator scripts do not, and switching the gate on now would
       * make the pipeline's health depend on a hardening pass that has not happened:
       *
       *   scripts/assemble.mjs       88% stmts · 69% branches
       *   scripts/registry.mjs       93% branches — nearly there
       *   scripts/ingest.mjs         65% stmts · 76% branches
       *   scripts/fetch-docs.mjs     15% stmts — shells out to `gh`
       *   scripts/check-registry.mjs  0% — a thin CLI over registry.mjs
       *
       * They have real tests; the gaps are error paths and the two scripts that
       * shell out. Closing those means injecting the `gh` runner the way verify.ts
       * injects its spawn over in brand — a refactor of the deploy pipeline, where a
       * mistake stops publishing rather than breaking a blog post. Its own change.
       *
       * Re-enabling is one edit: uncomment `thresholds` below, in the same change
       * that closes the gap, so the gate goes green on its first run.
       *
       * .astro files stay out regardless — pages and layouts carry markup rather
       * than branches, and `astro check` plus the build are what guard them.
       */
      all: true,
      include: ['site/src/lib/entries.ts', 'scripts/*.mjs'],
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
