# @rxova/astro-ui

## 0.7.0

### Minor Changes

- [#157](https://github.com/rxova/rxova-website/pull/157) [`f4d159f`](https://github.com/rxova/rxova-website/commit/f4d159f14592add66d1592127f56c4efcad00af3) - Give the docs header one row and one menu on phones. `sharedStarlightConfig` now also overrides `Header` and `MobileMenuFooter`: a splash page (no sidebar) gets a menu button beside search, and a page with a sidebar gets the same links at the foot of Starlight's own menu. Both hold every project's docs with the current one marked, the rxova.dev sections (Projects, Blog, Updates), GitHub, npm and the theme picker, which phones could not reach before. The menu buttons and every menu row are at least 44px tall. The desktop switcher is labelled "Docs", so it no longer reads as a second "Projects" beside the Projects link. A site that passes its own `Header` or `MobileMenuFooter` in `components` keeps it, and loses this menu on the pages it covers.

### Patch Changes

- [#155](https://github.com/rxova/rxova-website/pull/155) [`44941c3`](https://github.com/rxova/rxova-website/commit/44941c3a0ad799a5fba0efd6f3a98afe79b4db3f) - The footer's contact address is jonyk@rxova.dev.

## 0.6.2

### Patch Changes

- [#153](https://github.com/rxova/rxova-website/pull/153) [`1021d99`](https://github.com/rxova/rxova-website/commit/1021d99260194de133bd7d6d4bfc1143d779ff49) - The header, footer and section links point at rxova.dev.
- Updated dependencies [[`1021d99`](https://github.com/rxova/rxova-website/commit/1021d99260194de133bd7d6d4bfc1143d779ff49)]:
  - @rxova/brand@1.4.0

## 0.6.1

### Patch Changes

- [#147](https://github.com/rxova/rxova-website/pull/147) [`1b75207`](https://github.com/rxova/rxova-website/commit/1b7520719cbc8b2698d3ac50176a2a81c5013ab5) - `ScreenshotGrid` dims its screenshots in dark mode, so a light capture no longer glares off a dark page.

- [#145](https://github.com/rxova/rxova-website/pull/145) [`23f39fc`](https://github.com/rxova/rxova-website/commit/23f39fc866a1d9cb8b081c5c948e33288f30ca4f) - The docs header's section menu and the footer's Site column follow `@rxova/brand`'s new `SECTIONS`: Projects, Blog and Updates, with the site root as the about page.
- Updated dependencies [[`334afce`](https://github.com/rxova/rxova-website/commit/334afcef3b158737640061fef0e32ded9ba7c9fb), [`23f39fc`](https://github.com/rxova/rxova-website/commit/23f39fc866a1d9cb8b081c5c948e33288f30ca4f)]:
  - @rxova/brand@1.3.0

## 0.6.0

### Minor Changes

- [#142](https://github.com/rxova/rxova-website/pull/142) [`a2fc571`](https://github.com/rxova/rxova-website/commit/a2fc5714d956b55a23c02ca53e85e87ae923f3c3) - Add `CopyButton`: an icon button that puts a string on the clipboard, swaps to a tick for a moment and announces it to screen readers; `label` is its accessible name and tooltip. Add the `Copy` and `Check` glyphs under `components/icons/` for it. It draws in `currentColor`, so it sits on any surface, a dark terminal included. `QuickStart` now uses it instead of its own button.

### Patch Changes

- [#141](https://github.com/rxova/rxova-website/pull/141) [`247ec59`](https://github.com/rxova/rxova-website/commit/247ec598007c068dad9bc4096ae984031e8398d5) - `SiteFooter`'s Connect column lists `jonatan@rxova.org` as the contact address.

## 0.5.1

### Patch Changes

- [#130](https://github.com/rxova/rxova-website/pull/130) [`949cb63`](https://github.com/rxova/rxova-website/commit/949cb635486bf36c0f2021c44971a4addd8c2a15) - Show the project switcher and the rxova.org sections on phones on pages without a sidebar. Starlight gives a splash page no phone menu, so on a phone those links were only in the footer. The header now takes a second row for them there.

## 0.5.0

### Minor Changes

- [#126](https://github.com/rxova/rxova-website/pull/126) [`735733e`](https://github.com/rxova/rxova-website/commit/735733e1bb1ceee7c144256ce39d6ee630fc2e28) - Remove the `pageComponent` option of `sharedStarlightConfig` and the styles that offset Starlight's bar below the rxova.org shell. Docs now draw their own header and footer: drop `pageComponent` from your config if you still pass it.

### Patch Changes

- [#128](https://github.com/rxova/rxova-website/pull/128) [`af1c389`](https://github.com/rxova/rxova-website/commit/af1c389e91b18f31d1db3d8e7e0b04a44d721cc4) - Open the project switcher rightward and upward inside Starlight's phone menu. It opened leftward from the menu's left edge, off-screen, so no project could be picked on a phone.

## 0.4.0

### Minor Changes

- [#121](https://github.com/rxova/rxova-website/pull/121) [`93ab68c`](https://github.com/rxova/rxova-website/commit/93ab68c034d4f1cc3ae65d89bb0fbcca25be5162) - The Starlight header now carries the umbrella navigation: the project switcher followed by Blog, Updates and About, in the bar on wide screens and in the menu on phones. The links come from a new `SectionNav` component, and `SiteFooter` reads the same `SECTIONS` list from `@rxova/brand`.

### Patch Changes

- Updated dependencies [[`93ab68c`](https://github.com/rxova/rxova-website/commit/93ab68c034d4f1cc3ae65d89bb0fbcca25be5162)]:
  - @rxova/brand@1.2.0

## 0.3.0

### Minor Changes

- [#117](https://github.com/rxova/rxova-website/pull/117) [`cdd4b7b`](https://github.com/rxova/rxova-website/commit/cdd4b7bf86eaae258019d72ff01d2a06b5ea0d19) - `SiteFooter` takes an `origin` prop: `''` makes every rxova.org link root-relative, so a preview or staging build links to itself. Its own page links now end in a slash, which GitHub Pages serves without a redirect.

- [#113](https://github.com/rxova/rxova-website/pull/113) [`a40d944`](https://github.com/rxova/rxova-website/commit/a40d9445511531624731f9babc841e8d2345c43f) - Remove `components/SiteShell.astro`. It was the header-less document the blog and updates were built with while they were separate builds composed into the site at deploy time; both are now routes of the site app with their own layout, and nothing else used it. Give a page its own layout around `Header` and `SiteFooter` instead.

### Patch Changes

- Updated dependencies [[`00d152e`](https://github.com/rxova/rxova-website/commit/00d152eb9bb2921c4b023e60488879f2637f6a76)]:
  - @rxova/brand@1.1.1

## 0.2.0

### Minor Changes

- [#107](https://github.com/rxova/rxova-website/pull/107) [`3d95f7f`](https://github.com/rxova/rxova-website/commit/3d95f7fbef94253acbc43ebb4dbd3503290e4690) - Add `CodeRecipes`: titled source listings in a self-styled code frame, each with a linked heading anchored under a configurable id prefix. react-inputs' `IntegrationRecipes` with the recipes passed in.

- [#100](https://github.com/rxova/rxova-website/pull/100) [`7f4ee8b`](https://github.com/rxova/rxova-website/commit/7f4ee8bb94c7e7617ad2c2171bf0c68b9511e10b) - Add `CtaBand`: a centred call to action with a row of pill buttons, primary or minimal, external ones marked. Moved from the journey and react-inputs docs sites; the primary button reads `--rx-on-primary` from `@rxova/brand`.

- [#109](https://github.com/rxova/rxova-website/pull/109) [`fbcce0c`](https://github.com/rxova/rxova-website/commit/fbcce0c52c6b1ce6a705fd4d89dc1e1b26ea73a9) - Add `DataTable`: facts as a framed table in `SizeTable`'s style, with a labelled scrollable region, column headings, a row heading per row, code cells and an optional caption. react-inputs' `FrameworkCompatibilityMatrix` with the columns and rows passed in.

- [#104](https://github.com/rxova/rxova-website/pull/104) [`a6fbd3f`](https://github.com/rxova/rxova-website/commit/a6fbd3f093eefff6caf05706ed1ee675e864a9e2) - Add `DocAccordion` and `DocAccordionItem`: a `<details>` stack for a prose page, with no client script. Moved from the journey docs site, reading `--rx-*` tokens directly instead of Starlight's `--sl-*` ladder.

- [#96](https://github.com/rxova/rxova-website/pull/96) [`e2768f2`](https://github.com/rxova/rxova-website/commit/e2768f2b40729aabe943b5f552b09466301f9d94) - Add `Icon`, the frame every glyph draws in (a 16px grid in the text colour, `size` and `solid` props, decorative by default), and the glyphs `Prev`, `Next`, `Play`, `Pause`, `Replay`, `Expand` and `Collapse` under `components/icons/`.

- [#98](https://github.com/rxova/rxova-website/pull/98) [`f25c4fe`](https://github.com/rxova/rxova-website/commit/f25c4fe37f2fd07de22371d3ae4cc715461ee9d8) - Add two stylesheets: `styles/landing.css`, the Starlight overrides a splash landing page needs (the `[data-has-hero]` rules journey and react-inputs each kept in their own `home.css`), and `styles/mermaid.css`, which restyles `rehype-mermaid`'s build-time SVG with the tokens so diagrams follow the theme.

- [#106](https://github.com/rxova/rxova-website/pull/106) [`67371e0`](https://github.com/rxova/rxova-website/commit/67371e033e413c87bbd6f2beb94388803068b719) - Add `ModeTabs`: a numbered progression of modes, each a prose column beside a code pane fed by the named slot it points at. Moved from the journey docs site, where the slots were a fixed `linear` / `graph` pair.

- [#105](https://github.com/rxova/rxova-website/pull/105) [`225de9c`](https://github.com/rxova/rxova-website/commit/225de9c68be2559a1312a6fc1fa1d726beb16c7d) - Add `ProofStats`: the gradient-framed proof band whose figures count up once, on scroll, and read at their final value without JS. Moved from the journey and react-inputs docs sites.

- [#102](https://github.com/rxova/rxova-website/pull/102) [`22d97a6`](https://github.com/rxova/rxova-website/commit/22d97a6bf89ba4f5137a4852c7260abc1eca0401) - Add `QuickStart`: an install command with a copy button beside a slotted snippet. Moved from the journey and react-inputs docs sites, keeping journey's focusable, labelled command region.

- [#110](https://github.com/rxova/rxova-website/pull/110) [`6a32caa`](https://github.com/rxova/rxova-website/commit/6a32caa129c595b3c8043c23777ec0fe2ff966b6) - Add `ScreenshotGrid`: screenshots through Astro's `<Image>` in hairline frames, each with a numbered mono label and a line of detail, and an optional link beneath. journey's `DevtoolsShowcase` with the shots and the link as props.

- [#99](https://github.com/rxova/rxova-website/pull/99) [`56847d0`](https://github.com/rxova/rxova-website/commit/56847d0c764d9b48e1f3659557b03e57f6ced9de) - Add `Section`: a landing-page section (eyebrow, heading, lede and a slot) that opts its subtree out of Starlight's prose rules. Moved from the journey and react-inputs docs sites.

- [#103](https://github.com/rxova/rxova-website/pull/103) [`4a1a150`](https://github.com/rxova/rxova-website/commit/4a1a150270c3da3b2a6b68d6fa5b462a9dca35e8) - Add `SizeTable`: per-package bundle budgets as a captioned table with right-aligned tabular figures. Moved from the react-inputs docs site.

- [#108](https://github.com/rxova/rxova-website/pull/108) [`8dc7e6d`](https://github.com/rxova/rxova-website/commit/8dc7e6d81972b1a3fc85005acd6333f4b3caeab2) - Add `ValueGrid`: a grid of claims in the landing's language, a gradient hairline over each, a faint-ink Lucide icon beside the title and the body under it. `icon` is a `lucide-static` name, inlined at build time, so a site no longer imports its own `?raw` SVGs; `lucide-static` becomes a dependency. Moved from the journey and react-inputs docs sites.

### Patch Changes

- Updated dependencies [[`f25c4fe`](https://github.com/rxova/rxova-website/commit/f25c4fe37f2fd07de22371d3ae4cc715461ee9d8)]:
  - @rxova/brand@1.1.0

## 0.1.0

### Minor Changes

- [#85](https://github.com/rxova/rxova-website/pull/85) [`bd46592`](https://github.com/rxova/rxova-website/commit/bd46592a55a7521e01109316a8c1f7493b2dbfaa) - First release: the chrome (`SiteShell`, `Header`, `SiteFooter`, `ProjectSwitcher`, `ThemeToggle`, `ThemeScript`), the Starlight preset and overrides, the stylesheets and the primitives (`PageHeader`, `BackLink`, `ShowMore`, `VisuallyHidden`) that used to live in, or were copied around, `@rxova/brand`.

### Patch Changes

- Updated dependencies [[`8370a29`](https://github.com/rxova/rxova-website/commit/8370a29628a6f4d9aba6d257f844db525bed761e)]:
  - @rxova/brand@1.0.0
