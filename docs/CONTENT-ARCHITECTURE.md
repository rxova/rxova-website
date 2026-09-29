# The content architecture

How **rxova.dev/blog** and **rxova.dev/updates** are put together, and why that way
rather than the several other ways they could have been.

The short version: the blog and the updates are routes of the site app, `apps/site`,
built in the same `astro build` as the landing and `/about`. Package docs are the only
thing brought in at deploy time: their repositories build complete pages with
`@rxova/astro-ui`, whose header and footer link the rest of rxova.dev, and this repo
publishes them as built, adding only the analytics beacon.

## One app, since September 2026

```
apps/site/content/posts    ─┐
apps/site/content/updates   ├─ astro build (apps/site) ─→ dist/ ─→ assemble.ts ─→ _site/
apps/site/content/authors   │                                            ▲
packages/website-schemas      ─┘                        fetch-docs.ts (package docs only)
```

Until then the blog and the updates were two more Astro builds, each published by its
own workflow, sent to `ingest.yml`, persisted as a `content-blog` or `content-updates`
release and composed into a site shell like a project's docs were then. That kept one code path for
every surface, and it cost three things:

- **A flicker on every navbar click between sections.** Each build emitted its own CSS
  and fonts under its own base (`/_astro/`, `/blog/_astro/`, `/updates/_astro/`). The
  files were identical, but at different URLs the browser fetched them again, so moving
  between the landing, the blog and the updates rendered text in the fallback font first.
- **Three builds and two extra workflows** for content that lives in this repo anyway.
- **A round trip through ingest** before a post reached the site, where the deploy that
  follows every merge could simply build it.

So the two sections moved into the site app as routes. Their prose moved to
`apps/site/content`, with one author registry for both. The `blog` and `updates`
entries left `sources.json`, and the `publish-blog`/`publish-updates` workflows went with
them. Every URL, feed, canonical link and sitemap entry came out the same; the only
change a reader sees is that the fonts and styles are fetched once for the whole site.

The `site` kind below stays: it is the way to mount a static site built somewhere else
at `/<id>/`, which no longer happens to include these two.

## `kind`, and why it is not an escape hatch

Mounts are **derived** from a source's `id`, never written in `sources.json` — that
is what makes it impossible for a mount to disagree with the base URL its tree was
built against, a class of bug whose symptom is a live page with every stylesheet
404ing.

`/blog` is not under `/packages/`, so the derivation gained a second rule rather
than an override:

| `kind`              | base              | mount           |
| ------------------- | ----------------- | --------------- |
| `package` (default) | `/packages/<id>/` | `packages/<id>` |
| `site`              | `/<id>/`          | `<id>`          |

Still derived: a source says _what it is_, and the paths follow. An unknown kind is
refused rather than quietly treated as a package, which would mount a surface at a
path nothing links to. Everything downstream — artifact name, release tag, asset
name — stays uniform, so ingest and fetch never branch on kind.

## What lives where

| Where                                        | Owns                                                                                 |
| -------------------------------------------- | ------------------------------------------------------------------------------------ |
| `packages/` in this repo                     | prose, frontmatter schemas, design tokens, the site chrome and the docs chrome       |
| package repositories                         | documentation content, built into complete pages with `@rxova/astro-ui`              |
| `apps/`, `scripts/` and workflows, this repo | the site's own pages, the deploy, and the analytics beacon added to docs at assembly |

The renderer sits with the content: each package repository builds its own HTML and
assets. The chrome is shared by package rather than by composition. Every docs build
takes its header and footer from `@rxova/astro-ui`, so a change to them ships as a
release that the docs repos take.

## Rejected alternatives

Four of these were built before the current shape, so they are recorded with what
they actually cost rather than what they looked like on paper.

**Content in this repo.** Simplest by a distance. Rejected because contributors would
open pull requests against the repo holding the Pages configuration, `sources.json`
and the deploy credentials. Worth revisiting the day that stops mattering — it
deletes more machinery than anything else here.

**The website checks brand out at build time.** Built, and reverted. It worked, and
cost: a read token for a private repo held in two workflows here; a pull request from
a fork unable to build at all, since forks get no secrets; and two mental models,
with docs shipped in while prose was reached out for.

**A bespoke artifact pipeline for prose** — brand uploads, an `ingest-content.yml`
here downloads and persists, a `fetch-content.mjs` unpacks. Also built, also
reverted. It worked and needed a second cross-repo token, a second ingest, a second
fetch and a release that had to be seeded by hand before the first deploy could
succeed. All of it duplicating machinery this repo already had.

**Brand pushes the release asset here directly.** Would have removed that second
token, since brand's dispatch PAT already carries `contents: write`. Rejected in
favour of keeping the transfer one-directional: brand publishes artifacts, this repo
decides what it accepts.

**A dedicated `rxova/content` repo.** Correct if brand must stay private _and_
outside authors are needed — it would be public, so guests could contribute with no
checkout token. Revisit when the first outside author appears.

**Source components built centrally.** Rejected because the website would have to
install and execute every producer's Astro, TypeDoc, image and browser toolchain.
Complete pages built with a shared package keep the builds independent.

**The site composes docs into its own shell.** Built and retired in September 2026. Docs
repos shipped body-only pages and the deploy spliced them into a site template, under
the site's header. A docs page then had two fixed bars from two builds: the site's
ribbon and Starlight's own. Keeping them aligned took shared CSS offsets, and on iOS
they slid apart when the page overscrolled. Drawing the rxova.dev links inside
Starlight's bar removed the second bar and the splicing with it.
