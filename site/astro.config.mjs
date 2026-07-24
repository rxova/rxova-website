// @ts-check
import { defineConfig } from 'astro/config'

// The landing lives at the domain root. Docs are mounted alongside it under
// /packages/... by the aggregator, so the landing itself always builds at base "/".
export default defineConfig({
  site: 'https://rxova.org',
  base: '/',
  // Emit `/page/index.html` (directory-style) so URLs stay clean behind the
  // CloudFront directory-index function used for the docs subpaths.
  build: { format: 'directory' },
  trailingSlash: 'ignore',
})
