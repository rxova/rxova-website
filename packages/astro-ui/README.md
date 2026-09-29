<h1 align="center">@rxova/astro-ui</h1>

<p align="center">
  Astro components, the Starlight preset and the shared chrome for every
  <a href="https://rxova.dev">rxova.dev</a> surface, built on
  <a href="../brand"><code>@rxova/brand</code></a>.
</p>

---

## Use

### In a Starlight docs site

```js
// astro.config.mjs
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import { sharedStarlightConfig } from "@rxova/astro-ui/starlight";

export default defineConfig({
  site: process.env.DOCS_URL ?? "https://rxova.dev",
  base: process.env.DOCS_BASE_URL ?? "/",
  integrations: [
    starlight(
      sharedStarlightConfig({
        project: "use-everywhere",
        sidebar: [{ label: "Learn", items: [{ autogenerate: { directory: "learn" } }] }],
      }),
    ),
  ],
});
```

That gets you the tokens, the typefaces, the rxova mark linking back to the
umbrella site, the cross-project switcher, the shared footer and Pagefind search.

### In a plain Astro site

```astro
---
import "@rxova/brand/fonts.css";
import "@rxova/astro-ui/styles/document.css";
import SiteFooter from "@rxova/astro-ui/components/SiteFooter.astro";
---
```

`document.css` is `chrome.css` plus a reset and base element styles. Load
`chrome.css` alone where something else owns the document: its reset is
unlayered and would flatten a Starlight page.

## What's in it

| Export                                     | What it is                                                                                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@rxova/astro-ui/starlight`                | `sharedStarlightConfig()`, the preset every docs site spreads                                                                                     |
| `@rxova/astro-ui/starlight/*.astro`        | The Starlight overrides: `SiteTitle`, `SocialIcons`, `Footer`, `ThemeSelect`                                                                      |
| `@rxova/astro-ui/components/*.astro`       | Chrome (`Header`, `SiteFooter`, …), primitives (`PageHeader`, `BackLink`, `ShowMore`, `VisuallyHidden`, `Icon`) and the components in the gallery |
| `@rxova/astro-ui/components/icons/*.astro` | Glyphs in the `Icon` frame: `Prev`, `Next`, `Play`, `Pause`, `Replay`, `Expand`, `Collapse`                                                       |
| `@rxova/astro-ui/scripts/show-more`        | `enhanceShowMore()`: batches a `[data-reveal-list]` behind a `ShowMore`                                                                           |
| `@rxova/astro-ui/lib/entries`              | Ordering, bylines, dates and excerpts shared by /blog and /updates                                                                                |
| `@rxova/astro-ui/styles/document.css`      | For sites that own their document: `chrome.css`, a reset, base element styling                                                                    |
| `@rxova/astro-ui/styles/chrome.css`        | What the header and footer need, with nothing document-level                                                                                      |
| `@rxova/astro-ui/styles/starlight.css`     | Maps `--rx-*` onto Starlight's `--sl-*`, plus the footer                                                                                          |
| `@rxova/astro-ui/styles/landing.css`       | The Starlight overrides a splash landing page needs; load it through `customCss`                                                                  |
| `@rxova/astro-ui/styles/mermaid.css`       | Restyles `rehype-mermaid`'s build-time SVG with the tokens, so diagrams follow the theme                                                          |

There is no barrel: each component has its own path, so a page only loads the
CSS of the components it imports.

## Development

Run everything from the repo root. `apps/preview` renders the Starlight preset
and the plain-Astro chrome; `pnpm run verify` runs `astro check`, the tests and
the export checks for this package.

`apps/preview` also carries the gallery: one page per component under
`/gallery/`, each state in a `Story` frame. `pnpm --filter @rxova/preview
screenshots` rebuilds it and writes `screenshots/<component>.png` here (git-ignored), light
and dark, to attach to the pull request that adds or changes a component.

`apps/storybook` is the Storybook: a story file per component with its states,
a Docs page built from the component's frontmatter, and a light/dark toolbar.
`pnpm --filter @rxova/storybook dev` serves it with live controls.

## License

MIT © Jonatan Kruszewski
