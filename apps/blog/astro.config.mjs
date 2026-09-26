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
  // Responsive by default, which is the only way a body image gets a srcset.
  //
  // A cover is rendered by `[...slug].astro`, so it can say `widths` and `sizes` for
  // itself. An image embedded in markdown cannot: `.md` has no component override,
  // so whatever the default is, is what every embed gets — and the default without
  // this was a single full-size file handed to phones as well as desktops.
  //
  // The `sizes` this derives is the image's own width, which over-declares against a
  // 44rem column: a desktop fetches one candidate larger than it needs. That is the
  // wrong trade to lose sleep over next to shipping a 1400px original down a phone
  // connection, and the cover — the one image on the page that blocks render — sets
  // its `sizes` explicitly and is unaffected.
  image: { layout: 'constrained' },
  vite: {
    ssr: {
      // @rxova/brand and @rxova/website-schemas both ship uncompiled TypeScript, and Node
      // refuses to strip types under node_modules. Inlining routes them through
      // esbuild, which transpiles them fine.
      noExternal: ['@rxova/brand', '@rxova/astro-ui', '@rxova/website-schemas'],
    },
  },
})
