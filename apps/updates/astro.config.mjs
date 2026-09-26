// @ts-check
import { defineConfig } from 'astro/config'
import { RXOVA_ORIGIN } from '@rxova/brand'

/**
 * Built for the base URL the aggregator will mount this at, never for `/`.
 *
 * rxova-website only relocates a built tree — it never rewrites asset paths — so a
 * build made for the wrong base deploys a page with every stylesheet 404ing. The
 * base comes from the environment for exactly the reason the docs sites do it:
 * `pnpm dev` wants `/`, CI wants `/blog/`, and neither should have to remember.
 *
 * The value CI passes is derived by `@rxova/website-schemas`' `baseFor`, which is the same
 * function rxova-website derives its mount from — so the two cannot disagree.
 */
export default defineConfig({
  site: RXOVA_ORIGIN,
  base: process.env.DOCS_BASE_URL ?? '/',
  // Directory-style URLs, to match the CloudFront directory-index function the
  // aggregator's other subpaths are served behind.
  build: { format: 'directory' },
  trailingSlash: 'ignore',
  vite: {
    ssr: {
      // @rxova/brand and @rxova/website-schemas both ship uncompiled TypeScript, and Node
      // refuses to strip types under node_modules. Inlining routes them through
      // esbuild, which transpiles them fine.
      noExternal: ['@rxova/brand', '@rxova/astro-ui', '@rxova/website-schemas'],
    },
  },
})
