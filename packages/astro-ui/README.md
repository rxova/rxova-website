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

| Export                                 | What it is                                                                                                                                                      |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@rxova/astro-ui/starlight`            | `sharedStarlightConfig()`, the preset every docs site spreads                                                                                                   |
| `@rxova/astro-ui/starlight/*.astro`    | The Starlight overrides: `SiteTitle`, `SocialIcons`, `Footer`, `ThemeSelect`                                                                                    |
| `@rxova/astro-ui/components/*.astro`   | Chrome (`SiteShell`, `Header`, `SiteFooter`, …), primitives (`PageHeader`, `BackLink`, `ShowMore`, `VisuallyHidden`), the landing set and the docs blocks below |
| `@rxova/astro-ui/scripts/show-more`    | `enhanceShowMore()`: batches a `[data-reveal-list]` behind a `ShowMore`                                                                                         |
| `@rxova/astro-ui/lib/entries`          | Ordering, bylines, dates and excerpts shared by /blog and /updates                                                                                              |
| `@rxova/astro-ui/lib/icons`            | `lucideGlyph(name)`: a Lucide icon's inner markup, read at build time                                                                                           |
| `@rxova/astro-ui/styles/document.css`  | For sites that own their document: `chrome.css`, a reset, base element styling                                                                                  |
| `@rxova/astro-ui/styles/chrome.css`    | What the header and footer need, with nothing document-level                                                                                                    |
| `@rxova/astro-ui/styles/starlight.css` | Maps `--rx-*` onto Starlight's `--sl-*`, plus the footer                                                                                                        |
| `@rxova/astro-ui/styles/landing.css`   | The Starlight overrides a splash landing page needs around the landing set; load it through `customCss`                                                         |
| `@rxova/astro-ui/styles/mermaid.css`   | Restyles `rehype-mermaid`'s build-time SVG with the tokens, so diagrams follow the theme                                                                        |

### The landing set

What a project's landing page under Starlight's `splash` template is built from. Each takes plain
props; the code panes come in through slots, so a page writes fenced blocks and gets the docs'
highlighting.

| Component        | What it is                                                                     |
| ---------------- | ------------------------------------------------------------------------------ |
| `Section`        | Eyebrow, heading, lede and a slot, opted out of Starlight's prose rules        |
| `CtaBand`        | A centred call to action with a row of pill buttons                            |
| `QuickStart`     | An install command with a copy button beside a slotted snippet                 |
| `ProofStats`     | The gradient-framed proof band; figures count up once, on scroll               |
| `ValueGrid`      | A card grid; `icon` is a `lucide-static` name, inlined at build time           |
| `SizeTable`      | Per-package bundle budgets as a table                                          |
| `ModeTabs`       | A numbered progression, each mode's code in the named slot it points at        |
| `ScreenshotGrid` | Captioned screenshots through Astro's `<Image>`, with an optional link beneath |

### The docs blocks

For a prose page: `DocAccordion` and `DocAccordionItem` (a `<details>` stack with no client
script), `CodeRecipes` (titled source listings, each with a linked heading) and `DataTable` (a plain
table with a row heading per row, in Starlight's wrapper).

There is no barrel: each component has its own path, so a page only loads the
CSS of the components it imports.

## Development

Run everything from the repo root. `apps/preview` renders the Starlight preset
and the plain-Astro chrome; `pnpm run verify` runs `astro check`, the tests and
the export checks for this package.

## License

MIT © Jonatan Kruszewski
