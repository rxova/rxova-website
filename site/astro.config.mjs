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
  vite: {
    ssr: {
      // @rxova/brand ships TypeScript source with no build step. Vite externalises
      // node_modules for SSR by default, which would hand `src/sites.ts` to Node —
      // and Node refuses to strip types under node_modules ("Stripping types is
      // currently unsupported for files under node_modules"). Inlining the package
      // routes it through esbuild instead, which transpiles it fine.
      noExternal: ['@rxova/brand'],
    },
    server: {
      // src/lib/projects.ts imports the repo-root sources.json, which is outside
      // the Astro project root. The production build resolves it fine; the dev
      // server refuses to serve files outside its allowlist without this.
      fs: { allow: ['..'] },
    },
  },
})
