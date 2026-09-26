<h1 align="center">@rxova/brand</h1>

<p align="center">
  Design tokens, typefaces and project data for every
  <a href="https://rxova.org">rxova.org</a> surface.
</p>

---

## Why this exists

`rxova.org` serves one surface per project from a single origin — an Astro
landing at `/`, plus [overlock](https://github.com/rxova/overlock),
[journey](https://github.com/rxova/journey),
[react-inputs](https://github.com/rxova/react-inputs) and
[use-everywhere](https://github.com/rxova/use-everywhere) docs, each built in its
own repo and mounted as a static tree under `/packages/<name>/`.

This package is what makes them one site: the tokens they are styled with and
the project list they link between. The components built on it, including the
Starlight preset, live in [`@rxova/astro-ui`](../astro-ui).

Upgrading from 0.x? See [MIGRATION.md](MIGRATION.md).

## Install

```sh
pnpm add @rxova/brand
```

## What's in it

| Export                    | What it is                                                             |
| ------------------------- | ---------------------------------------------------------------------- |
| `@rxova/brand`            | `PROJECTS`, `REPOS`, `docsUrl()`, `siteUrl()`, `canonicalUrl()`, feeds |
| `@rxova/brand/tokens.css` | The `--rx-*` custom properties. Everything derives from these.         |
| `@rxova/brand/fonts.css`  | Self-hosted Space Grotesk + IBM Plex Mono                              |
| `@rxova/brand/assets/*`   | The mark, logos and per-project OG images                              |

## The palette

A warm monochrome — warm near-black ink on warm paper — with the logo's
blue → violet → magenta gradient as the **only** chroma in the system. The
restraint is the identity; resist adding a second accent hue.

The gradient earns exactly two placements: the hairline under the site header,
and the current-project dot in the switcher.

Neutrals flip between light and dark, so a downstream mapping references a token
once and gets both modes for free.

## Development

The package lives in a two-package workspace — itself and `apps/preview`, a
Starlight site that renders it. Run everything from the repo root; Turbo fans the
tasks out and replays whatever the commit did not touch.

```sh
pnpm install
pnpm run dev      # the preview site — the only place to *look* at the theme
pnpm run verify   # audit, dedupe, format, lint, types, astro check, cards, contract
pnpm run og       # re-render the social cards after a palette or tagline change
```

There is no build step: Astro resolves `.ts` straight from `node_modules`. That
means nothing would catch a file missing from `files` or a stale `exports` path,
which is what `pack:smoke` is for — it packs the real tarball and asserts every
declared subpath resolves.

The social cards are generated from `tokens.css` and `sites.ts`, so they cannot
drift from the brand — but they are committed, so a palette or tagline change
silently invalidates them. `check:og` compares a hash of those _inputs_ against
`scripts/og-manifest.json` rather than re-rendering and diffing the PNGs: resvg
ships per-platform native builds, and an output diff would fail CI for cards that
are perfectly correct.

### Trying a change in a consumer

`apps/preview` links the package by `workspace:*`, so most changes can be seen
immediately with `pnpm run dev`. It cannot catch a `files` omission, though —
the link resolves to the source directory, where every file exists. That is what
`check:exports` is for.

For a real external consumer (the landing, a docs site), iterate through snapshot
releases:

1. Add a changeset (`pnpm exec changeset`).
2. Run the **Snapshot** workflow — publishes `0.x.y-next.N` to the `next` tag.
3. In the consumer: `pnpm add @rxova/brand@next`.

Slower per iteration than linking, but CI resolves exactly what you resolved, so
a broken export map fails on your machine rather than three repos later.

## License

MIT © Jonatan Kruszewski
