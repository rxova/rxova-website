# @rxova/brand

## 0.15.0

### Minor Changes

- [#106](https://github.com/rxova/brand/pull/106) [`cb588f2`](https://github.com/rxova/brand/commit/cb588f29ee1e8671a790a41f512be9ec0c61e502) - Put every page on the wide measure, and keep a short page's footer at the bottom of the window.
  
  `--max` (the short alias in `chrome.css`) now points at `--rx-max-wide` (72rem) instead of `--rx-max` (44rem). `Header` and `SiteShell` centre on it, so /blog and /updates now sit under the header at the same width as the landing instead of in a 44rem column that looked narrow on a large screen and changed width from page to page. Running text keeps its own measure inside the wider page. Consumers that set their own `max-width` from `--rx-max` are unaffected; ones that read `--max` widen with it.
  
  `astro.css` makes `body` a column at least one screen tall, with `main` taking the slack, so a page with little content — /blog with two posts — no longer leaves its footer halfway up the window. Every direct child of `body` is full width at zero specificity, so a centred `max-width` block still fills its row as it did before `body` became a flex container. Documents that do not load `astro.css` (the Starlight docs) are unaffected.

## 0.14.2

### Patch Changes

- [#104](https://github.com/rxova/brand/pull/104) [`938e91b`](https://github.com/rxova/brand/commit/938e91b51d2e789119cb35d19f4b70a6c2f5ee0e) - Lowercase the journey display label, matching how the project names itself

- [#101](https://github.com/rxova/brand/pull/101) [`a4bb764`](https://github.com/rxova/brand/commit/a4bb7640149df3215cd6fb2fa8994f11883d256d) - Let SiteFooter take the projects whose docs are mounted, so it cannot link to a project that is switched off

- [#101](https://github.com/rxova/brand/pull/101) [`526acb6`](https://github.com/rxova/brand/commit/526acb6086c73cfa4c054f299bbe395870ed2de8) - Move overlock to the end of PROJECTS, so the project rail and docs switcher lead with a library rather than a CLI

- [#101](https://github.com/rxova/brand/pull/101) [`65d7bbb`](https://github.com/rxova/brand/commit/65d7bbbf452f0c35dcef53590cffc7477361b8f3) - Let the footer's top grid collapse below its track floor, so narrow viewports no longer scroll sideways

- [#104](https://github.com/rxova/brand/pull/104) [`8c66228`](https://github.com/rxova/brand/commit/8c66228a0ae9c3bb300f3a0e4d036914e315a4d5) - Widen the dark theme's surface steps so cards, panels and rules are visible against the page

## 0.14.1

### Patch Changes

- [#92](https://github.com/rxova/brand/pull/92) [`16d367f`](https://github.com/rxova/brand/commit/16d367f02e96b2817a9195e60637247cd43c9e2a) - Point ts-extended-errors at its real npm package, `ts-extended-errors` (unscoped), instead of `@rxova/ts-extended-errors`.

## 0.14.0

### Minor Changes

- [#90](https://github.com/rxova/brand/pull/90) [`cd7259c`](https://github.com/rxova/brand/commit/cd7259cdc89ccc456138d7f94b49f0a4d26bb259) - Add `ts-extended-errors` to `PROJECTS`, ahead of its repository going public.
  
  The project is a single TypeScript library — typed error classes, `cause`-chain helpers and a JSON
  round trip that rebuilds the original classes — published as `@rxova/ts-extended-errors`. Its docs
  mount at `/packages/ts-extended-errors/` like every other project, so the aggregator needs no change.
  
  `PROJECTS` order is display order everywhere it is read (the landing cards, the docs switcher, the
  footer's project column), and the entry goes last: it is the newest project and the narrowest in
  scope, so it sits after the ones a reader is more likely to be looking for.
  
  Adding a project changes the card set, so `assets/og/ts-extended-errors.png` and the regenerated
  `scripts/og-manifest.json` ship here too — `check:og` fails otherwise. The five existing cards are
  left byte-for-byte as they were: the manifest fingerprints the _inputs_, and re-rendering PNGs on a
  different machine produces a diff that says nothing.

## 0.13.1

### Patch Changes

- [#84](https://github.com/rxova/brand/pull/84) [`08b750f`](https://github.com/rxova/brand/commit/08b750fe0ec76a301892faa8809672f72aebac3f) - Keep the mobile menu button below the shell header on Starlight 0.42. 0.42 replaced the
  `<starlight-menu-button>` wrapper with a bare `button.sl-menu-button`, so the offset rule stopped
  matching and the button sat under the rxova header. `starlight.css` now targets both markups,
  since the peer range still reaches back to 0.36.
  
  The components are also reformatted by prettier-plugin-astro 1.0. Its whitespace output follows
  Astro's own, so the rendered HTML does not change.

## 0.13.0

### Minor Changes

- [#76](https://github.com/rxova/brand/pull/76) [`25d5d29`](https://github.com/rxova/brand/commit/25d5d299385d641608f3c83997478a1f9d84a47a) - Add `overlock` to `PROJECTS`, first, and widen the umbrella copy past the browser.
  
  overlock is the first rxova project that is not a browser library: it reads a git patch and
  reports the edits that make a test suite ask less than it did, and it runs as a CLI, an agent
  stop hook, an MCP server or a GitHub Action. `PROJECTS` order is display order everywhere it is
  read — the landing cards, the docs switcher, the footer's project column — so it goes first.
  
  That makes two pieces of copy written for a browser-only umbrella wrong rather than merely
  narrow, so both move with it: the footer blurb and the umbrella social card now say "libraries
  and developer tools". Adding a project changes the card set, so `assets/og/overlock.png` and the
  regenerated `scripts/og-manifest.json` ship here too — `check:og` fails otherwise.
  
  The docs mount at `/packages/overlock/` like every other project; the aggregator needs no change
  for a CLI.

## 0.12.0

### Minor Changes

- [#70](https://github.com/rxova/brand/pull/70) [`32fa287`](https://github.com/rxova/brand/commit/32fa287f7e76b38d79bfa5752f8e088e08d49a05) - Add `renderFeed` for RSS 2.0, and give `SiteShell` an `image`, `feed` and `jsonLd` prop.

  `renderFeed` is hand-written rather than pulled from `@astrojs/rss`: it is a few hundred bytes of well-specified XML, both consumers are static builds where the feed is one prerendered endpoint, and the dependency would otherwise be carried twice to save a `map()`. The escaping is the part with teeth, so it is one exported function with its own tests — including the ordering bug where escaping `<` before `&` ships `&amp;lt;`, and the RFC 822 date format RSS requires instead of ISO 8601.

  `SiteShell` gained three optional props. `image` overrides the social card, because what makes the best card is something only the caller knows — a post with a cover should share its cover, and a page about one project should carry that project's card rather than the umbrella one. `feed` advertises RSS as `rel="alternate"`. `jsonLd` emits structured data, serialised with `<` escaped so a `</script>` inside a title cannot close the element early and spill the payload into the document.

  The shared Starlight config now also emits `SoftwareSourceCode` on every docs page, built from the `PROJECTS` entry — so a project that changes its tagline or repository updates its structured data with it, rather than describing itself as it was when someone last remembered to edit a hand-written block.

### Patch Changes

- [#68](https://github.com/rxova/brand/pull/68) [`5c34453`](https://github.com/rxova/brand/commit/5c34453a1869a9950d86f7d87da134d236cb2dc9) - List all nine react-inputs components in `PROJECTS`, not the three the project shipped with.

  `packages` is what the aggregator renders as the project's package list, and it still named
  currency, OTP and rating — so a reader met a three-component suite six components after that
  stopped being true. The date, time, phone, password, tags and file inputs are now in it, ordered
  the way the project's own README orders them, behind the meta-package a newcomer installs first.

  The list stays curated rather than derived: `@rxova/codemod` is a migration tool rather than
  something to install alongside the inputs, and it is not here for the same reason
  `use-everywhere`'s tooling packages are not in its entry.

## 0.11.0

### Minor Changes

- [#49](https://github.com/rxova/brand/pull/49) [`8a690f8`](https://github.com/rxova/brand/commit/8a690f8dcc5f2d40d581e1ef3c20d6aa46c76ac2) - Add `@rxova/brand/chrome.css` — the tokens, the footer's styles and the short
  aliases, with no reset and no base element styling — and rebuild `astro.css` on
  top of it.

  The reset in `astro.css` is unlayered, and Starlight puts every rule it has in
  `@layer starlight.*`. Unlayered wins over layered whatever the specificity, so
  once rxova-website started composing the docs into its shell, the shell's
  stylesheet followed the docs into the page and `* { margin: 0; padding: 0 }`
  flattened it: no content padding, the sidebar sitting on top of the prose, and
  the right sidebar adrift. Every page under `/packages/*` was affected.

  A surface that renders the shared chrome into a document it does not own now has
  a stylesheet it can load safely. `astro.css` is unchanged for the surfaces that
  do own their document — it is `chrome.css` plus the same reset as before.

## 0.10.0

### Minor Changes

- [#44](https://github.com/rxova/brand/pull/44) [`17b9652`](https://github.com/rxova/brand/commit/17b9652f56a07898b38f65d0592c60d62364c83b) - Give every SiteShell page a canonical URL that resolves without a redirect.

  rxova.org is published as a directory-style tree, so `/blog` answers 301 and only
  `/blog/` answers 200 — but all four SiteShell call sites passed the unslashed path,
  so every blog and updates page declared itself canonical at a URL that redirects.
  `SiteShell` now normalises via the new `canonicalUrl` export, which is also
  available for anything else building a canonical.

## 0.9.0

### Minor Changes

- [#40](https://github.com/rxova/brand/pull/40) [`33085f6`](https://github.com/rxova/brand/commit/33085f6d1b871f8f600eb25414060a73bbf6cace) - Add an embedded Starlight mode for website-owned chrome.

## 0.8.2

### Patch Changes

- [#38](https://github.com/rxova/brand/pull/38) [`421d7bf`](https://github.com/rxova/brand/commit/421d7bf8cac5113e3711a048b0dace43ce859887) - Show About in the shared header and the footer's default "Site" column.

  rxova.org grew an `/about` page and the landing's own menu picked it up, but
  `SiteShell` — the shell /blog and /updates render — builds its menu from a fixed
  `SECTIONS` list of Blog and Updates, so a reader who arrived on a post had no way
  to reach it. It is now a fixed trailing item, exactly as Projects is a fixed
  leading one, and for the same reason: it belongs to the landing's Astro build, so
  it is always deployed and can never be the current surface in this shell.

  `SiteFooter`'s default `site` list had the same hole, which reached further — the
  shell and every docs site render the footer without the prop, so the "Site"
  column listed Blog and Updates and nothing else. About is safe in that default
  unconditionally, because it is a page of the landing's build rather than a mount:
  there is no artifact to wait for, so it exists whenever the landing does. The
  prop still exists and still overrides, which is what the umbrella repo uses to
  gate the genuinely mounted surfaces.

  Callers passing `site` explicitly are unaffected.

## 0.8.1

### Patch Changes

- [#36](https://github.com/rxova/brand/pull/36) [`879e4b9`](https://github.com/rxova/brand/commit/879e4b98499390fb63341401f675ee1d99a08743) - Write the brand name as **Rxova**, and stop calling the projects "React libraries".

  The wordmark in `Header`, `SiteFooter` and the docs sites' `SiteTitle` label,
  the footer's copyright line, and the social cards all said `rxova`. They now say
  `Rxova`. Lower-case survives everywhere it is an identifier rather than the
  name — the `@rxova/*` package scope, `rxova.org`, `github.com/rxova`, asset file
  names and CSS prefixes are untouched.

  The footer blurb and the umbrella social card also claimed "open-source React
  libraries". Two of the three projects ship a framework-agnostic core that runs
  in a worker or a plain script — `@rxova/journey-core` and `@use-everywhere/core`
  — and Journey also ships a browser extension. React is a binding we provide, not
  the boundary of what these are, so both now say "small TypeScript libraries for
  the browser". The card's tagline gains the same correction, replacing a claim it
  could not support with what is actually inside.

  All four cards in `assets/og` are re-rendered, since the wordmark sits on every
  one of them.

  Copy only — no API, no markup structure, no styles.

## 0.8.0

### Minor Changes

- [#34](https://github.com/rxova/brand/pull/34) [`bbd69ed`](https://github.com/rxova/brand/commit/bbd69ed5009ce1e75a57b03431338ad5e856cb7a) - `SiteFooter` takes its "Site" column as data.

  The column hardcoded Blog and Updates, so it advertised both on every surface
  whether or not they were deployed — a surface whose first build has not landed
  yet got a footer link to a 404. Only the umbrella repo knows what is actually
  mounted (`sources.json` gates the mount and the link together), so the list is
  now a `site` prop, exactly as `Header` takes `items`.

  The prop is optional and defaults to Blog and Updates, so `SiteShell`, the docs
  sites' `Footer` and the preview render exactly as before.

## 0.7.0

### Minor Changes

- [#32](https://github.com/rxova/brand/pull/32) [`4d6422a`](https://github.com/rxova/brand/commit/4d6422a476c71f08c1dce10eb89575148ecc1205) - Export the site header as a standalone `Header` component.

  The header markup and styles used to live inside `SiteShell`, and the website
  repo kept a hand-rolled copy for its landing — which drifted, so the landing
  missed the sticky-header update the shell got. `Header` is now its own exported
  component (`@rxova/brand/components/Header.astro`): `SiteShell` renders it, and
  the landing imports and renders the same one, so there is a single source of
  truth for how the header looks and behaves across every plain-Astro surface.

  It takes its menu as `items` (fully-resolved `href`s plus which is `current`)
  and its `homeHref`/`logoSrc` as props, because the surfaces resolve URLs against
  different base paths and the landing derives its menu from what is deployed.
  `SiteShell`'s rendered output is unchanged.

## 0.6.0

### Minor Changes

- [#30](https://github.com/rxova/brand/pull/30) [`d2608a4`](https://github.com/rxova/brand/commit/d2608a4e79253f62ebd28e7d09e1c69cbdc0bc47) - Sticky site header and a fuller shared footer.

  `SiteShell` now renders its header as a sticky, translucent bar with the theme
  toggle inside it rather than floating over it — on a phone the floating button
  sat on top of the nav links, and the header scrolled away entirely on a long
  post. `ThemeToggle` takes a new `floating` prop (default `true`, unchanged
  behaviour) for surfaces that place it themselves, and in the header it is
  borderless and muted to sit at the weight of the nav links beside it.

  `ThemeToggle`'s icon sizing is fixed: the rules were scoped, so they stopped
  applying the moment the script swapped the icon by innerHTML, and every state
  after the first render drew Lucide's raw 24px glyph at stroke-width 2.

  `SiteFooter` gains a brand block, a "Site" column linking Blog and Updates from
  every surface, and a bottom bar carrying the copyright and the legal links. Its
  styles moved from `starlight.css` into `footer.css`, imported by both entry
  points, so the plain Astro surfaces render it styled — `SiteShell` now uses it
  in place of the dot-separated link row.

## 0.5.0

### Minor Changes

- [#21](https://github.com/rxova/brand/pull/21) [`4a3300e`](https://github.com/rxova/brand/commit/4a3300e0d248f92eda77cda1e01b4a7dbcf86b40) - Add `SiteShell`, the layout for rxova.org's non-Starlight surfaces — `/blog` and
  `/updates`.

  It lived in both packages as a 244-line file that differed on four lines, and that
  is exactly how the two came to render their menu in a different order: a fix had to
  be made twice, and once was enough to forget.

  Which menu item is current is now derived from `BASE_URL` rather than declared per
  package, so the surfaces cannot disagree about it. Not for the docs sites — those
  are Starlight and take their chrome from `sharedStarlightConfig`.

## 0.4.0

### Minor Changes

- [#14](https://github.com/rxova/brand/pull/14) [`5e96207`](https://github.com/rxova/brand/commit/5e962070590f24a2b6e5b38f02e45e2c35c2c4cd) - Add `ThemeScript` and `ThemeToggle` components, for the rxova surfaces that are not
  Starlight — the umbrella landing, `/blog` and `/updates`.

  The pre-paint script is the one thing every surface must do identically: they all
  read the same localStorage key, so a visitor keeps their choice walking between the
  landing, a docs site and the blog. It was copied into three repos and had already
  drifted once — one copy read `theme`, which nothing on this origin writes, so those
  pages silently ignored the visitor's choice and always rendered the system default.

  Distinct from `ThemeSelect`, which is the Starlight override the docs sites use for
  their own toggle.

## 0.3.0

### Minor Changes

- [#11](https://github.com/rxova/brand/pull/11) [`650e75c`](https://github.com/rxova/brand/commit/650e75c067566b18e164b24006b7655df2b20f2c) - Add a `REPOS` registry alongside `PROJECTS`, covering every rxova repo an update
  can be about — the three published projects plus `rxova-website` and `brand`.

  `PROJECTS` stays what it is: the things with docs, an npm package and a landing
  card. But rxova.org's new `/updates` records progress on the repos that ship no
  package too, and validating those entries against `PROJECTS` would have made them
  unrepresentable. Exported with `REPO_IDS` and `getRepo` for the same reasons
  `PROJECTS` exports `getProject`.

## 0.2.0

### Minor Changes

- [#10](https://github.com/rxova/brand/pull/10) [`c704e92`](https://github.com/rxova/brand/commit/c704e922835a67fc63674989c4f0287bf4fd1fb6) - Raise the minimum Node engine to `>=24.0.0`, matching the version pinned in `.nvmrc`. Consumers on Node 20–23 will now see an `engines` warning on install.

### Patch Changes

- [#7](https://github.com/rxova/brand/pull/7) [`f76a5a9`](https://github.com/rxova/brand/commit/f76a5a9a2084e07cf6ccf76ba75b11eeb11db115) - Re-apply the saved theme when a page is restored from the back/forward cache.

  Starlight applies `starlight-theme` from `ThemeProvider`'s inline script and from the
  `<starlight-theme-select>` constructor, both of which run only while the document is
  parsed. A back/forward navigation that hits the bfcache restores the document instead, so
  neither runs and the page keeps whatever theme it had when the visitor left. Because all
  of rxova.org is one origin sharing one key, changing the theme on the landing page (or
  another docs site) and pressing Back left the restored page visibly on the old theme.

  Adds a `ThemeSelect` override that wraps Starlight's own picker and resyncs the document
  theme and the picker on `pageshow`.

## 0.1.2

### Patch Changes

- [#4](https://github.com/rxova/brand/pull/4) [`acdc97a`](https://github.com/rxova/brand/commit/acdc97a297b3f529cf96db79af2ad8de2b4850a5) - Move the package to `packages/brand` in a Turborepo workspace alongside a new preview site. The published tarball is unchanged file-for-file; only `repository.directory` and the README differ.

## 0.1.1

### Patch Changes

- [#2](https://github.com/rxova/brand/pull/2) [`862b2f5`](https://github.com/rxova/brand/commit/862b2f58406c310c69fce2efd6120798e4b770f1) - Stop the flash of unstyled text on every navigation. `fonts.css` now declares its own `@font-face` rules with `font-display: optional` instead of `@import`ing @fontsource's, which hardcode `swap` and sat behind a serialised nested-import chain.

## 0.1.0

### Minor Changes

- [`b16e92f`](https://github.com/rxova/brand/commit/b16e92ff90854457dae5cd60d023dccfa478681f) - Initial release: design tokens, the Starlight theme mapping, and the shared site
  chrome for rxova.org.

  - `tokens.css` — the `--rx-*` custom properties. A warm monochrome with the logo
    gradient as the only chroma; every neutral flips between light and dark, so a
    downstream mapping references a token once and gets both modes.
  - `starlight.css` — maps `--rx-*` onto Starlight's `--sl-*`, plus the styling for
    the shared header and footer.
  - `fonts.css` — self-hosted Space Grotesk and IBM Plex Mono.
  - `sharedStarlightConfig()` — the Starlight options every rxova docs site has in
    common, so each repo declares only its sidebar.
  - `PROJECTS` / `docsUrl()` / `siteUrl()` — the rxova.org site map. Cross-project
    links have to be absolute, because the four surfaces sit at four base paths on
    one origin.
  - Component overrides — `SiteTitle` (mark links back to the umbrella site),
    `SocialIcons` (adds the cross-project switcher), `Footer` (Starlight's own
    footer plus the shared four-column one).

- [`8c1016e`](https://github.com/rxova/brand/commit/8c1016eb96c86b9d20284b302d7666a04b6f9186) - Add generated social cards at `@rxova/brand/assets/og/*.png`.

  One 1200×630 card per rxova.org surface, rendered from `tokens.css` and
  `sites.ts` so they cannot drift from the palette or the taglines. The landing
  previously used the square 1024px logo as its `og:image`, which crops badly in
  Slack and Twitter cards.

- [`fe4e84c`](https://github.com/rxova/brand/commit/fe4e84c00d62382093a7176fb296c6487c4fb8e4) - Add `@rxova/brand/astro.css`, the entry point for plain Astro surfaces.

  Carries the reset and base element styling that Starlight already provides to
  docs sites, plus aliases from the short token names the rxova.org landing was
  written against (`--bg`, `--fg`, `--rule`, …) onto their `--rx-*` equivalents —
  so adopting the package doesn't mean rewriting several hundred lines of scoped
  component styles in one commit.
