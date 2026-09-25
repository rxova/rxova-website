# @rxova/website-schemas

## 0.6.1

### Patch Changes

- [#84](https://github.com/rxova/brand/pull/84) [`72f81ec`](https://github.com/rxova/brand/commit/72f81ecbf3d7d89e3acfd60a97b29ac83ad0cab4) - Build with tsdown 0.23 and keep the published file names. tsdown 0.16 started writing
  `index.mjs` / `index.d.mts` on the node platform, which `exports` does not point at, so the
  config now sets `fixedExtension: false`. `dist/` still ships `index.js`, `index.d.ts`,
  `index.cjs` and `index.d.cts`.

## 0.6.0

### Minor Changes

- [#55](https://github.com/rxova/brand/pull/55) [`0edb84f`](https://github.com/rxova/brand/commit/0edb84f7b64ac17caa693fc4ee2cb3c70d7f67e9) - Add the `storybook` source kind: a project's Storybook workshop, id `storybook-<project>`, mounted at `/storybook/<project>/` so every project's workshop nests under one `/storybook/` tree. `storybook` joins `RESERVED_PATHS` so a site surface cannot claim that tree wholesale.

## 0.5.0

### Minor Changes

- [#47](https://github.com/rxova/brand/pull/47) [`e0d484d`](https://github.com/rxova/brand/commit/e0d484d5ad43bacc96cede73fc23465c7c596c2f) - Let an update be a sketch, the way a post already can be.

  `updateBase` gains `draft`, defaulting to `false` — the same field `postBase` carries,
  not a second word for it. Writing an update used to mean publishing it: there was no
  way to commit a note, keep it under the validator, and decide later whether it goes
  out. Existing entries are unaffected, since the default is what they already meant.

## 0.4.0

### Minor Changes

- [#40](https://github.com/rxova/brand/pull/40) [`33085f6`](https://github.com/rxova/brand/commit/33085f6d1b871f8f600eb25414060a73bbf6cace) - Add the rendered page-component bundle contract.

## 0.3.0

### Minor Changes

- [#27](https://github.com/rxova/brand/pull/27) [`0acb69a`](https://github.com/rxova/brand/commit/0acb69ac335b146beee56d016d75e9311d7b2ef0) - Add `coverAlt` to `postBase`, so a post can describe its cover image.

  Optional, and its absence is meaningful rather than a gap: a decorative cover wants
  `alt=""`, which is what a renderer should emit when the field is missing. Setting it
  without a `cover` is a mistake the pre-merge validator now reports.

## 0.2.0

### Minor Changes

- [#17](https://github.com/rxova/brand/pull/17) [`0b0a342`](https://github.com/rxova/brand/commit/0b0a342a82254c7a50c80ae4f24c0e83501c563f) - Ship compiled output instead of raw TypeScript.

  0.1.0 published `src/*.ts` behind `exports`, matching `@rxova/brand`'s convention.
  That works for bundlers, and does not work at all for `node`: type stripping is
  refused inside `node_modules`, so a plain `import '@rxova/website-schemas'` throws
  `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`.

  @rxova/brand gets away with it because only Astro consumes it, and its config lists
  the package in `noExternal` so Vite transpiles it. This package cannot: two of its
  consumers are rxova-website's plain Node scripts — `check-registry.mjs`, which
  validates `sources.json` against `sourceEntry`, and `ingest.mjs`, which validates
  the dispatch payload. Neither goes through a bundler.

  Built with tsdown, matching the sibling package repos. Dual ESM + CJS with types for
  both, and zod left external so consumers extending these schemas do not end up with
  a second copy and broken `instanceof`.

## 0.1.0

### Minor Changes

- [#14](https://github.com/rxova/brand/pull/14) [`5e96207`](https://github.com/rxova/brand/commit/5e962070590f24a2b6e5b38f02e45e2c35c2c4cd) - First release. The contracts between the rxova repos, in one published package so
  neither side of a boundary is hand-rolled:

  - **Content frontmatter** — `postBase`, `updateBase`, `authorBase`, the update tag
    enum, and the entry-filename parser. Written in this repo's `content/`, validated
    before a merge, and extended by the apps that render it with the fields only Astro
    can express.
  - **Registry entries** — `sourceEntry`, plus `mountFor` / `baseFor`. What
    rxova-website's `sources.json` may contain, including the rule that a `site` may
    not claim a reserved top-level path and that a `package` needs landing copy while
    a `site` must not carry any.
  - **The ingest dispatch** — `dispatchPayload`. What a repo sends when it has a build
    ready. It crosses a trust boundary, so every field is constrained rather than
    trusted: `run_id` indexes an API path, and `ref` and `sha` reach release notes.

  Published as `@rxova/website-schemas`. It reached that name through two unpublished
  ones: `@rxova/content-schema`, which described only the first of the three
  contracts, and `@rxova/schemas`, which read as though it covered every rxova repo
  rather than the website's boundaries. Neither ever shipped, so 0.1.0 is the first
  version on npm under any name.

### Patch Changes

- [#14](https://github.com/rxova/brand/pull/14) [`5e96207`](https://github.com/rxova/brand/commit/5e962070590f24a2b6e5b38f02e45e2c35c2c4cd) - Target zod 4, matching the major Astro 7 bundles. Mixing majors across the boundary
  fails at runtime with `keyValidator._parse is not a function` when an app extends a
  base schema with `reference()` or `image()` — the hazard the package's own docs warned
  about, now that there are apps here to hit it.
