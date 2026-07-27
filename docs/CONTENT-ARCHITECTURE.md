# The content architecture

How **rxova.org/blog** and **rxova.org/updates** are put together, and why that way
rather than the several other ways they could have been.

The short version: they are built in the **brand monorepo** and shipped here as
ordinary dists, through the same ingest the packages already use. This repo mounts
them. It has no blog-specific pipeline, no second contract, and no code that knows
what a post is.

## They are sources, like everything else

```
rxova/brand                          rxova/rxova-website
  content/posts    ─┐                  ingest.yml     (validate + persist)
  content/updates   ├─ astro build ─→  content-blog   (release)
  content/authors   │   upload dist    content-updates
  packages/         ┘   dispatch       fetch-docs.mjs (pull at deploy)
    content-schema                     assemble.mjs   (mount at /blog, /updates)
```

Nothing above is new except the two entries in `sources.json`. `ingest.yml`,
`fetch-docs.mjs` and `assemble.mjs` are the same code paths that carry
`/packages/journey/`, and they need to know nothing about prose.

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

| Repo                  | Owns                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------ |
| `rxova/brand`         | the prose, the frontmatter schema, the validator, **and the pages that render them** |
| `rxova/rxova-website` | the landing, and mounting what arrives                                               |

The renderer sits with the content because that is what makes it one model instead
of two: brand builds a dist and hands it over, exactly as `rxova/journey` does with
its docs. This repo goes back to being what it says it is — an aggregator plus its
own landing.

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

**Schema published to npm.** Unnecessary: the schema ships inside brand, next to the
pages that consume it, so there is nothing to version.

## Still open

- `/blog` and `/updates` are `"enabled": false` until brand ships their first build.
  The flag gates the mount _and_ the menu link together, so nothing advertises a 404
  in the meantime. Flip both to `true` once the first artifact lands.
- Blog and Updates links in `@rxova/brand`'s `ProjectSwitcher`, so docs pages at
  `/packages/*` link back.
