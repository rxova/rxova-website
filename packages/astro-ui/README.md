<h1 align="center">@rxova/astro-ui</h1>

<p align="center">
  Astro components, the Starlight preset and the shared chrome for every
  <a href="https://rxova.org">rxova.org</a> surface, built on
  <a href="../brand"><code>@rxova/brand</code></a>.
</p>

---

## Use

### In a Starlight docs site

```js
// astro.config.mjs
import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'
import { sharedStarlightConfig } from '@rxova/astro-ui/starlight'

export default defineConfig({
  site: process.env.DOCS_URL ?? 'https://rxova.org',
  base: process.env.DOCS_BASE_URL ?? '/',
  integrations: [
    starlight(
      sharedStarlightConfig({
        project: 'use-everywhere',
        sidebar: [{ label: 'Learn', items: [{ autogenerate: { directory: 'learn' } }] }],
      }),
    ),
  ],
})
```

That gets you the tokens, the typefaces, the rxova mark linking back to the
umbrella site, the cross-project switcher, the shared footer and Pagefind search.

### In a plain Astro site

```astro
---
import '@rxova/brand/fonts.css'
import '@rxova/astro-ui/styles/document.css'
import SiteFooter from '@rxova/astro-ui/components/SiteFooter.astro'
---
```

`document.css` is `chrome.css` plus a reset and base element styles. Load
`chrome.css` alone where something else owns the document: its reset is
unlayered and would flatten a Starlight page.

## What's in it

| Export                                 | What it is                                                                                                              |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `@rxova/astro-ui/starlight`            | `sharedStarlightConfig()`, the preset every docs site spreads                                                           |
| `@rxova/astro-ui/starlight/*.astro`    | The Starlight overrides: `SiteTitle`, `SocialIcons`, `Footer`, `ThemeSelect`                                            |
| `@rxova/astro-ui/components/*.astro`   | Chrome (`SiteShell`, `Header`, `SiteFooter`, …) and primitives (`PageHeader`, `BackLink`, `ShowMore`, `VisuallyHidden`) |
| `@rxova/astro-ui/scripts/show-more`    | `enhanceShowMore()`: batches a `[data-reveal-list]` behind a `ShowMore`                                                 |
| `@rxova/astro-ui/lib/entries`          | Ordering, bylines, dates and excerpts shared by /blog and /updates                                                      |
| `@rxova/astro-ui/styles/document.css`  | For sites that own their document: `chrome.css`, a reset, base element styling                                          |
| `@rxova/astro-ui/styles/chrome.css`    | What the header and footer need, with nothing document-level                                                            |
| `@rxova/astro-ui/styles/starlight.css` | Maps `--rx-*` onto Starlight's `--sl-*`, plus the footer                                                                |

There is no barrel: each component has its own path, so a page only loads the
CSS of the components it imports.

## Development

Run everything from the repo root. `apps/preview` renders the Starlight preset
and the plain-Astro chrome; `pnpm run verify` runs `astro check`, the tests and
the export checks for this package.

## License

MIT © Jonatan Kruszewski
