// @ts-check
import { defineConfig } from 'astro/config'
import { RXOVA_ORIGIN } from '@rxova/brand'

/**
 * Built for the base URL the aggregator mounts it at (`DOCS_BASE_URL`), `/` in dev.
 * The aggregator never rewrites asset paths, so a wrong base 404s every stylesheet.
 */
export default defineConfig({
  site: RXOVA_ORIGIN,
  base: process.env.DOCS_BASE_URL ?? '/',
  // Directory-style URLs, to match the CloudFront directory-index function the
  // aggregator's other subpaths are served behind.
  build: { format: 'directory' },
  trailingSlash: 'ignore',
  // Responsive by default so images embedded in markdown get a srcset; the cover
  // sets its own `widths` and `sizes` in `[...slug].astro`.
  image: { layout: 'constrained' },
  vite: {
    ssr: {
      // @rxova/brand and @rxova/website-schemas ship uncompiled TypeScript, which Node
      // won't strip under node_modules; inlining routes them through esbuild.
      noExternal: ['@rxova/brand', '@rxova/astro-ui', '@rxova/website-schemas'],
    },
  },
})
