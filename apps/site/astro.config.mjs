// @ts-check
import { defineConfig } from "astro/config";
import { RXOVA_ORIGIN } from "@rxova/brand";
import expressiveCode from "astro-expressive-code";

// The whole site — landing, /about, /blog, /updates — is this one app at the domain root.
// Package docs are mounted alongside it under /packages/... by the aggregator.
export default defineConfig({
  site: RXOVA_ORIGIN,
  base: "/",
  // Emit `/page/index.html` (directory-style) so URLs stay clean behind the
  // CloudFront directory-index function used for the docs subpaths.
  build: { format: "directory" },
  trailingSlash: "ignore",
  // Responsive by default so images embedded in blog markdown get a srcset; the cover
  // sets its own `widths` and `sizes` in pages/blog/[...slug].astro.
  image: { layout: "constrained" },
  integrations: [
    // The code in each project's walkthrough; options live in ./ec.config.mjs because
    // `<Code>` loads them as a module and the theme selector is a function.
    expressiveCode(),
  ],
  vite: {
    ssr: {
      // @rxova/brand ships TypeScript source, which Node won't strip under
      // node_modules; inlining routes it through esbuild.
      noExternal: ["@rxova/brand", "@rxova/astro-ui", "@rxova/website-schemas"],
    },
    server: {
      // src/lib/projects.ts imports the repo-root sources.json, outside the project
      // root; the dev server won't serve it without this.
      fs: { allow: ["../.."] },
    },
  },
});
