# Writing for rxova.org

The blog lives in `apps/blog` and the updates stream in `apps/updates`. Each is
built on its own and mounted on **rxova.org** the same way a project's docs are. The full
design and the reasoning behind it live in
[`docs/CONTENT-ARCHITECTURE.md`](./CONTENT-ARCHITECTURE.md).

This page is the practical half: what to write, where, and what the frontmatter has
to say.

## Which surface

| Write here                          | For                                                       | Not for                |
| ----------------------------------- | --------------------------------------------------------- | ---------------------- |
| `apps/blog/posts` → `/blog`         | Essays, design rationale, deep dives — **the why**        | Lists of changes       |
| `apps/updates/updates` → `/updates` | Short dated notes on **what is moving**                   | Release notes verbatim |
| A project's `CHANGELOG.md`          | **What changed in a release** — generated from changesets | Prose                  |

The rule that keeps them apart: **an update never restates a release.** Link out to
one when there is something worth linking to — `links` and `version` are both
optional, and an update that just says what moved is a perfectly good update. A blog
post links to both and explains the thinking. If a post reads like a list of changes,
it belonged in updates.

## Adding a post

`apps/blog/posts/YYYY-MM-DDTHHMMSS-some-slug.md`. The prefix keeps the directory sorted
in an editor; `pubDate` is what actually orders the site, and the validator checks
the two agree. The URL is `/blog/some-slug` — the prefix is stripped, so re-dating a
post never breaks its link.

```yaml
---
title: Why rxova has a blog
description: One sentence. Used for the index, the meta description and social cards.
pubDate: 2026-07-27T14:30:05Z
authors: [rxova]
tags: [meta] # optional, freeform
draft: false # optional; sketches render locally and never in production, see Sketches
cover: ../images/some-slug/hero.png # optional, relative to this file
coverAlt: A description of the cover. # optional; see Images
updatedDate: # optional; must not be earlier than pubDate
---
```

The filename is a **full UTC timestamp to the second**, always:

```
apps/blog/posts/2026-07-27T143005-some-slug.md   pubDate: 2026-07-27T14:30:05Z
```

The two must be the same instant, and the validator says so with the exact rename
if they are not. `T` separates the time because `2026-07-27-143005-retrospective`
would otherwise be ambiguous, and there are no colons because Windows will not have
them in a filename.

One form rather than an optional time, because an optional one just moves the
problem: you then have to remember which form a given entry used, and a
frontmatter-only time silently breaks the one thing the prefix is for.

**Use UTC.** A local offset near midnight disagrees with its own filename for
reasons that take ten minutes to work out.

If two entries somehow land on the same second, the site falls back to sorting them
by slug. Deterministic, arbitrary, and not worth another digit.

## Images

Images live in `images/<slug>/`, beside the entries directory rather than inside it —
`posts/` holds markdown and nothing else, and the validator says so if an image lands
there. Paths are relative to the file that writes them, so from a post that is
`../images/<slug>/…`.

```
apps/blog/images/some-slug/hero.png
apps/blog/posts/2026-07-27T143005-some-slug.md
```

A cover goes in the frontmatter; anything else is a normal markdown embed:

```md
![A build pipeline, with the docs job highlighted](../images/some-slug/pipeline.png)
```

Either way Astro optimises the file, converts it to WebP, emits a `srcset` and
rewrites the URL to sit under `/blog/`. **Do not** hand-write a path into `/blog/…`
or drop files in a `public/` directory — those bypass the pipeline, and a path
written for `/blog/` is wrong the moment the surface is mounted anywhere else.

Export at roughly the width you want at 2× — about 1400px for a full-width image.
Astro only ever scales down.

### Alt text

`coverAlt` is optional, and leaving it off is a real choice rather than a shortcut. A
cover that only sets a mood is decorative, and the accessible markup for decoration is
an empty `alt` — which is what the renderer emits when `coverAlt` is absent. Write one
when the image carries information a reader would otherwise miss, and skip it when the
image is atmosphere. Alt text with no `cover` to describe is an error.

Embedded images take their alt text inline, the ordinary way: `![like this](…)`, or
`![](…)` when the image is decorative.

## Adding an update

`apps/updates/updates/YYYY-MM-DDTHHMMSS-some-slug.md`, same timestamp rule as posts. Keep
it to a paragraph or two — the updates page renders entries in full, inline, as one
stream.

```yaml
---
title: rxova.org gains a blog and an updates feed
date: 2026-07-27T09:15:00Z
repos: [rxova-website, brand] # at least one, see below
authors: [rxova]
tags: [feature, infra] # from the fixed list, see below
draft: false # optional; sketches render locally and never in production, see Sketches
version: '@rxova/journey-core@1.4.0' # optional
links: # optional — no obligation to chase down a release URL
  - label: Release notes
    href: https://github.com/rxova/journey/releases/tag/v1.4.0
---
```

### `repos`

At least one, because the updates page is filterable — an entry about nothing can never
be filtered to. Valid ids come from `REPOS` in `packages/brand/src/sites.ts`: the
three published projects plus `rxova-website` and `brand`. Add an id there if a new
repo starts producing progress worth logging.

### `tags`

A fixed list, in `packages/website-schemas/src/index.ts`:

`release` · `feature` · `fix` · `docs` · `infra` · `deprecation` · `breaking`

Curated rather than freeform because a filter UI is only as good as its vocabulary —
left open it grows `release`, `releases` and `Release` inside a month. Adding a tag
is a one-line PR here; there is no release to wait for.

## Sketches

A **sketch** is an entry that is written down but not published: `draft: true`, on a
post or on an update.

```yaml
draft: true
```

It behaves the same on both surfaces. Run the surface you are writing for:

```sh
pnpm --filter @rxova/blog dev      # or @rxova/updates
```

and it renders in place — in the blog index and on its own page, or inline in the
updates stream at its date — with a `Draft` badge, so previewing a sketch never looks
like having published one. (Note the filter: bare `pnpm dev` at the root runs the
Starlight preview app, which has neither surface in it.)

The production build emits nothing at all for a sketch: no page, no listing, no entry
in the stream, and no repo or tag filter chip that only it would have justified.

A sketch is still checked in full. `pnpm validate:content` holds it to every rule an
entry is held to — the filename must agree with the date, `repos` must be non-empty
and known, each `authors:` id must have a file. The flag defers publication, not
correctness: the point is that a sketch is ready to go out the day you flip the flag,
rather than a half-parsed file that fails a deploy months later.

So a sketch is committed like anything else. Holding one back is not a reason to keep
it out of the repo — that is what the flag is for.

## Adding yourself as an author

`apps/blog/authors/<your-id>.md` and `apps/updates/authors/<your-id>.md`: each
surface keeps its own registry. The id is the filename and is what entries reference.

```yaml
---
name: Your Name
url: https://example.com # optional
github: yourhandle # optional
bio: One line. # optional
---
```

`authors` is required on every post and entry, and there is no default — a default
would silently attribute a forgotten byline to whoever it happened to name. It is an
array so co-authored entries work without a later migration.

## Checking your work

```sh
pnpm validate:content
```

Reports every problem in one pass. It shares its schema with the renderer, so
anything it accepts will build — and it additionally checks that each `authors:` id
has a file, and that each `cover:` and each `![](…)` a body embeds resolves on disk,
which the renderer cannot do until deploy time.

To see one surface rendered, run `pnpm --filter @rxova/blog dev`, or `@rxova/updates`.

## Licensing

Prose in `apps/blog` and `apps/updates` is **CC BY 4.0** (see the `LICENSE` in
each), not the repo's MIT.
MIT is a software licence and reads oddly applied to an article. Submitting a post
means licensing it that way.

## Publishing

Merging to `main` with changes under `apps/blog` or `apps/updates` runs that
surface's publish workflow, which builds it and hands it to `ingest.yml` in this repo to
persist and redeploy. Nothing else is needed — no release and no version bump.
