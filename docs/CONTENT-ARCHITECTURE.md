# The content architecture

How **rxova.org/blog** and **rxova.org/updates** are put together, and why that way
rather than the several other ways they could have been.

The short version: producers build their own route bodies and page-specific head
content. This repo never learns what a post, update or documentation page is, but
it does own the public HTML shell around every one of them: global navigation,
footer, theme bootstrap and analytics.

## They are sources, like everything else

```
rxova/brand                          rxova/rxova-website
  content/posts    ─┐                  ingest.yml     (validate + persist)
  content/updates   ├─ astro build ─→  content-blog   (release)
  content/authors   │   upload dist    content-updates
  packages/         ┘   dispatch       fetch-docs.mjs (pull at deploy)
    content-schema                     assemble.mjs   (compose into website shell)
```

Nothing above is new except the two entries in `sources.json`. `ingest.yml`,
`fetch-docs.mjs` and `assemble.mjs` are the same code paths that carry
`/packages/journey/`, and they need to know nothing about prose. A schema-2
artifact is identified by `rxova-page-bundle.json`; schema-1 full-site artifacts
remain copyable during the migration.

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

| Repo                  | Owns                                                                                           |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| `rxova/brand`         | prose, frontmatter schemas, producer renderers, design tokens, Header and SiteFooter           |
| package repositories  | documentation content and Starlight's internal search/sidebar/page navigation                  |
| `rxova/rxova-website` | the public document shell, global chrome, aggregate analytics and deploy-time HTML composition |

The renderer still sits with the content: brand and package repositories build
their own HTML and assets. The boundary is the body-level PageComponent, not a
complete public site. This keeps producer toolchains independent while ensuring a
single website-owned shell is present on every deployed route.

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
Rendered PageComponent bundles preserve independent builds without giving up a
single public shell.

## Composition rules

- Website-owned head elements are charset, viewport, icons, global styles, theme
  bootstrap and Cloudflare Analytics.
- Producers own title, description, canonical/robots/Open Graph metadata,
  structured data and page-local scripts/styles.
- Source `html` and `body` classes/data attributes are merged into the shell so
  framework-generated layouts keep working.
- Package docs retain Starlight's internal header and page footer. They omit only
  the umbrella Rxova header/footer supplied by the website.
