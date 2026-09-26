// @ts-check
import { defineConfig } from 'astro/config'
import { RXOVA_ORIGIN } from '@rxova/brand'
import expressiveCode from 'astro-expressive-code'

// The landing lives at the domain root. Docs are mounted alongside it under
// /packages/... by the aggregator, so the landing itself always builds at base "/".
export default defineConfig({
  site: RXOVA_ORIGIN,
  base: '/',
  // Emit `/page/index.html` (directory-style) so URLs stay clean behind the
  // CloudFront directory-index function used for the docs subpaths.
  build: { format: 'directory' },
  trailingSlash: 'ignore',
  integrations: [
    // The code in each project's walkthrough on the landing — see ./ec.config.mjs.
    // Options in ./ec.config.mjs: the `<Code>` component needs them as a
    // module, and the theme selector below is a function, not JSON.
    expressiveCode(),
  ],
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
      fs: { allow: ['../..'] },
    },
  },
})
