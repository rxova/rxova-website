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
       * 95% per file, on an explicit list.
       *
       * `.astro` files are absent on purpose: pages, layouts and components carry
       * markup rather than branches, and what guards them is `astro check` plus the
       * build itself, which fails on a broken reference or an unresolvable image.
       * Padding the list with them would buy a bigger number and no more safety.
       *
       * `site/src/lib/content.ts` is also absent — it imports `astro:content`, a
       * virtual module only Astro can resolve, so nothing outside an Astro build can
       * import it. Its pure half was split into `entries.ts` precisely so the logic
       * worth testing is testable; what remains there is collection plumbing.
       *
       * The aggregator scripts are not here YET, and should be. Measured today:
       *
       *   scripts/assemble.mjs       88% stmts · 69% branches
       *   scripts/registry.mjs       93% branches — nearly there
       *   scripts/ingest.mjs         65% stmts · 76% branches
       *   scripts/fetch-docs.mjs     15% stmts — shells out to `gh`
       *   scripts/check-registry.mjs  0% — a thin CLI over registry.mjs
       *
       * They have real tests already; the gaps are the error paths and the two
       * scripts that shell out. Closing them means injecting the `gh` runner the way
       * verify.ts injects its spawn, which is its own change — doing it here would
       * bury a refactor of the deploy pipeline inside a PR about blog content.
       */
      all: true,
      include: ['site/src/lib/entries.ts'],
      exclude: ['**/*.test.*'],
      thresholds: {
        perFile: true,
        statements: 95,
        branches: 95,
        functions: 95,
        lines: 95,
      },
    },
  },
})
