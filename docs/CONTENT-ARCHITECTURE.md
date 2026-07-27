# The content architecture

How **rxova.org/blog** and **rxova.org/updates** are put together, and why that
way rather than the several other ways they could have been.

The short version: both are markdown in the **brand monorepo**, alongside the schema
that validates them. Brand packages both and ships them here; this repo persists what
arrives and renders it. No npm package, and nothing reaches across repos at build
time.

## The two repos

| Repo                  | Owns                                                        | Builds?                       |
| --------------------- | ----------------------------------------------------------- | ----------------------------- |
| `rxova/brand`         | `content/`, `packages/content-schema`, the `REPOS` registry | packages, never builds a site |
| `rxova/rxova-website` | rendering `/blog` and `/updates`                            | **the content**               |

The toolchain lives where the rendering lives. Brand holds prose and a schema; it
never builds a site.

## Why brand, and what it costs

The original design had a third repo, `rxova/content`, so that outside contributors
could open PRs without touching the repo that holds the Pages configuration,
`sources.json`, the ingest credentials and the deploy workflows. That reasoning still
stands, and it is why content is **not** in this repo.

Brand was chosen over a dedicated content repo because it collapses three layers:

- **No npm package.** The schema is workspace-private. This repo imports it out of
  the same checkout that brings the content, so schema and content are locked to one
  another _by construction_ — they are literally the same commit. Drift is
  unrepresentable rather than managed.
- **No reusable action.** Validation is brand's own CI running a script against its
  own workspace package.
- **No release per field.** A new required field or updates tag is one PR in brand,
  not a release plus bumps in two consumers.

The accepted cost: **brand is private, so outside contributors cannot publish.** That
was a deliberate YAGNI call — there is one author today. The data model stays ready
for more (see the authors registry below), so opening it up later is a move, not a
migration.

The second, smaller cost: a private checkout needs a PAT in `deploy.yml`. A public
content repo would have needed no secret.

### Pulling content out later

`git filter-repo` the `content/` directory into a new repo, change one checkout path
in `deploy.yml`, and publish `content-schema` to npm at that point. The frontmatter
contract — the expensive thing to change — is identical either way. This is why the
authors registry exists from day one even though there is one author: moving
directories is cheap, rewriting `authors:` across every post is not.

## `/blog` and `/updates` are not mounted artifacts

This is the thing to get straight, because this repo already has a mechanism that
looks like it should apply here and deliberately does not.

`/packages/<id>/` exists because a project's docs are coupled to that project's
source, toolchain and release cadence: they must be built where the code lives. That
coupling is what `ingest.yml`, the `content-<id>` releases, `fetch-docs.mjs` and
`assemble.mjs` all exist to manage — see [INPUTS-CONTRACT.md](./INPUTS-CONTRACT.md).

Prose has none of that coupling. So `/blog` and `/updates`:

- never go through `ingest.yml`
- never get a `content-<id>` release
- never appear in `sources.json`
- never touch `scripts/registry.mjs`

They are built by this repo's own Astro build and ride out inside the `landing`
artifact, exactly like `/privacy` and `/terms` already do.

### "But the website is an aggregator"

It is an aggregator **plus the site's own surfaces**. It has always owned `/`,
`/privacy` and `/terms`. These are two more of those, with their content sourced from
another repo instead of from `site/src/`.

Insisting on the stricter reading — that this repo renders nothing of its own — would
force brand to build a site, which means giving it Astro page routes, and it would
require an escape hatch in `registry.mjs` to mount outside `/packages/`. That last
part matters: mounts are _derived_ from `id` precisely so a mount cannot disagree with
the base URL its tree was built for. An escape hatch erodes an invariant that exists
on purpose. Rejected.

## The build

Brand never builds a site; it packages prose and sends it. This repo never reaches
into brand; it reads what was sent.

On a merge to `rxova/brand` touching `content/`:

1. Brand's `publish-content.yml` validates the tree, tars `content/` plus
   `packages/content-schema/src` and `packages/brand/src/sites.ts`, uploads that as
   the artifact `content-dist`, and dispatches here with its `run_id`.
2. This repo's `ingest-content.yml` downloads that artifact, checks it is the shape
   the build needs, and persists it as the rolling release **`content-prose`**.
3. It then calls `deploy.yml`, which runs `scripts/fetch-content.mjs` to unpack the
   release into `site/src/external`, builds, and publishes.

`ci.yml` runs the same fetch, so **CI builds what deploys**.

### Why a round trip rather than a checkout

The first version had this repo `actions/checkout` brand directly. It worked, and it
cost three things:

- **A read token for a private repo**, held in two workflows here.
- **Fork pull requests could not build at all.** They get no secrets, so the checkout
  failed and CI was red for anyone outside the org — on a repo whose whole point is
  that outside authors will eventually write for it.
- **Two mental models.** Docs were shipped in; prose was reached out for.

Reading from a release in _this_ repo needs only the built-in `GITHUB_TOKEN`. The one
cross-repo credential left is the `actions:read` token the ingest uses to pull the
artifact, and that is the same secret the docs ingest already uses.

The cost: CI and deploy build against the **last published** content rather than
brand's current `main`. That is what actually deploys, and brand's own validator is
the gate on the content itself, so the trade is worth it.

### Fail loudly

A missing `content-prose` release stops the build, naming the workflow to re-run. It
does not fall back to whatever is on disk: a silently stale blog is worse than a red
deploy, because nothing about the rendered site would tell you it had stopped
updating. `ingest-content.yml` takes the same line — it refuses an artifact missing
the schema, or one with no markdown at all, rather than persisting something every
later deploy would choke on.

### Importing the schema

The collections import the schema from the same checkout:

```ts
import { postBase, updateBase, authorBase } from '../external/packages/content-schema/src'
```

That package ships uncompiled TypeScript, exactly like `@rxova/brand` does. There is
already precedent for it in `astro.config.mjs` — `noExternal: ['@rxova/brand']` exists
because Node refuses to strip types under `node_modules`, and Vite transpiles it
instead. A relative import out of `site/src/external` avoids that problem entirely,
since it never looks like a dependency.

## Content layout

```
rxova/brand
  content/
    posts/2026-07-27-some-slug.md
    updates/2026-07-27-some-slug.md
    authors/rxova.md
    images/<slug>/hero.png
    LICENSE                 <- CC-BY-4.0, prose only
  packages/content-schema/  <- workspace-private, never published
```

Slugs come from the filename with the timestamp prefix stripped; `pubDate` / `date`
in frontmatter is what actually orders things. The prefix keeps the directory sorted
in an editor, nothing more — and it is a **full UTC timestamp to the second**
(`2026-07-27T143005-some-slug.md`), one form, always.

An optional time was tried first and rejected: it moves the problem rather than
solving it, since you then have to remember which form a given entry used, and a
frontmatter-only time silently breaks the one thing the prefix is for.

**Not literally `toISOString()`**, much as that would be convenient, because
`2026-07-27T14:30:05.000Z` contains colons and Windows will not have a colon in a
filename — a repo containing one cannot be cloned there at all. So the time is
compact, which is ISO 8601's own _basic_ format, and `new Date()` happens not to
accept it. `parseEntryFilename` and `stampToISO` in the schema package close that
gap: reconstructing the colons is one regex and needs no library, but it needed
writing once rather than in each repo that reads these names. `T` separates the time
because `2026-07-27-143005-retrospective` would otherwise be ambiguous.

Both repos parse filenames through that shared function, so they cannot disagree
about what a name means — the same reason the schema itself is shared.

Brand's validator enforces that the prefix and the frontmatter are the same instant.
Entries landing on the same second fall back to sorting by slug: arbitrary, but fixed,
so CI and a local build cannot disagree.

`content/` is CC-BY-4.0 rather than the repo's MIT. MIT is a code licence and reads
oddly applied to an article ("the Software"); CC-BY is the answer people expect when
they ask whether they may quote you.

## Three surfaces that all look like changelogs

Per-project `CHANGELOG.md` files already exist in each docs site. Adding a site-level
`/updates` and a `/blog` makes three things a reader could mistake for each other,
so the division has to be sharp:

| Surface                | Content                           | Canonical for                   |
| ---------------------- | --------------------------------- | ------------------------------- |
| Per-project changelogs | Generated from changesets         | **What changed in a release**   |
| `/updates`             | Short dated cross-project entries | **What is moving across rxova** |
| `/blog`                | Essays, rationale, deep dives     | **Why**                         |

`/updates` links out to releases; it never restates them. A release post on `/blog`
links to both and covers the reasoning. Without this rule the three drift and readers
cannot tell which to trust.

## Authors are a registry, not a string

`content/authors/<id>.md`, one file per author. Not a shared `authors.yaml`: two people
adding themselves in the same window then never conflict, and `CODEOWNERS` can scope
the directory.

Both collections reference authors through Astro's `reference()`, so a typo'd byline
**fails the build** rather than rendering `undefined`. Same principle as
`scripts/registry.mjs` and `site/src/lib/projects.ts` — make disagreement between two
registries unrepresentable rather than merely detectable.

Two deliberate choices:

- **`authors` is an array.** Co-authored release posts are real, and renaming `author`
  → `authors` later means editing every entry that exists by then. An array costs
  nothing today; everything currently reads `authors: [rxova]`.
- **It is required, with no default.** A default is the wrong failure mode once there
  is more than one author: a guest who forgets the field gets their post silently
  attributed to Rxova.

## `/updates` is a filterable stream

Entries render **in full, inline**, newest first, each with a stable `#slug` anchor.
They are short; a timeline reads better as one page than as a list of links to
one-paragraph pages. Per-entry pages only if entries start growing.

Filtering is client-side — this is a static site — but not every facet should be:

- **Repos** are a small known set from the brand registry, so `/updates/repos/<id>`
  is **pre-rendered as a real page**. Crawlable, shareable, and it gives each docs
  site somewhere to point for "what has been happening in Journey."
- **Tags** are a longer list that grows, so they are **client-side only**, reflected in
  the querystring (`?repo=journey&tag=release`) and pushed to history so a filtered
  view stays linkable.

Combined filters are client-side over the full DOM. Every entry is already rendered, so
filtering is show/hide — no fetching, no re-render. Worth revisiting past roughly 200
entries; not before.

Requirements that are easy to lose:

- **No-JS:** all entries show, the tag controls hide, and the repo links keep working
  because they are real hrefs.
- **A11y:** filters are real buttons with `aria-pressed`, and the result count is
  announced through an `aria-live` region. A filter that silently removes two-thirds of
  the page is invisible to a screen reader otherwise.

### `repos` is wider than `PROJECTS`

Entries about `rxova-website`, `brand` or the content itself are exactly what a progress
log covers, but `PROJECTS` holds only the three published packages — so validating
against it would make those entries unrepresentable.

So brand exports a **`REPOS` registry** alongside `PROJECTS`: the three projects plus
the non-package repos. `PROJECTS` stays what it is — the things with docs, npm packages
and landing cards.

### Tags are an enum, not freeform

A filter UI is only as good as its vocabulary. Freeform tags produce `release`,
`releases` and `Release` inside a month: three chips that each match a third of the
entries, with nothing to flag it.

So tags come from a small curated enum in the schema package. In this layout adding one
is a single PR, so the usual objection to enums does not apply.

The rejected fallback was freeform with normalisation plus a validator that rejects any
tag used by only one entry. It works, but it fails _later_ entries because of an
_earlier_ entry's typo, which is a baffling error to receive.

## The schema

`packages/content-schema` is workspace-private and never published. It exports the
plain-field bases:

```ts
export const postBase = z.object({ title, description, pubDate, updatedDate, tags, draft })

export const updateBase = z.object({
  title,
  date,
  repos: z.array(repoId).nonempty(), // validated against REPOS
  tags: z.array(updateTag).default([]), // the enum
  version: z.string().optional(),
  links: z.array(z.object({ label, href })).default([]),
})

export const authorBase = z.object({ name, url, github, bio })
```

`repos` is non-empty because an entry that is about nothing cannot be filtered to, and
would only ever surface in the unfiltered stream.

### What the bases cannot cover

`image()` and `reference()` are injected by Astro and do not exist in a plain Node
validator, so the same object cannot be used verbatim on both sides. This repo extends
the bases with the Astro-native fields:

```ts
schema: ({ image }) =>
  postBase.extend({
    authors: z.array(reference('authors')).nonempty(),
    cover: image().optional(),
  })
```

Brand's validator extends them with the on-disk equivalents, then does two checks Astro
cannot: that every author id has a matching file in `authors/`, and that `cover`
resolves on disk. So the pre-merge gate ends up _stronger_ than the build gate rather
than a lossy copy of it.

### zod

Astro bundles its own zod and re-exports it from `astro:content`. The schema package
declares zod as a **peer dependency**, and this repo depends on zod explicitly at the
version Astro ships, rather than leaning on the `astro:content` re-export — a second
copy of zod would still `.extend()` fine but makes type inference and `instanceof`
behave strangely.

## Rejected alternatives

**Content in this repo.** Simplest by a distance. Rejected because contributors would
be opening PRs against the deploy repo, and because the separation is worth real money
to the owner. Everything else here is downstream of that one decision.

**A dedicated `rxova/content` repo.** The design before this one. Correct if brand must
stay private _and_ outside contributors are needed — it is public, so guests can PR, and
no checkout token is required. Rejected for now because there is one author, and because
sharing a repo with the schema removes the npm package, the reusable action and the
per-field release cost. Revisit when the first outside author appears.

**A repo per collection** (blog and updates separately). Rejected on the shared
`authors/` registry: duplicating it reintroduces exactly the drift the shared schema
exists to prevent, in the registry that `reference()` validates against, where the
failure is silent.

**Brand builds its own site, ingested and mounted like a package.** Requires the
`registry.mjs` escape hatch discussed above, and puts Astro routes in the design-system
repo. Rejected.

**Schema published to npm.** Unnecessary once the consumer already checks the repo out.

**Freeform update tags.** See above — a filter UI needs a controlled vocabulary.

## Phase 1

In `rxova/brand`:

- [ ] `REPOS` registry alongside `PROJECTS`
- [ ] `packages/content-schema` — bases, the tag enum, zod as a peer dep
- [ ] `content/{posts,updates,authors,images}` + `content/LICENSE` (CC-BY-4.0)
- [ ] `authors/rxova.md`, one seed post, one seed updates entry
- [ ] `scripts/validate-content.ts` + a CI job + a turbo task
- [ ] `publish-content.yml` — path-filtered `repository_dispatch`

In this repo:

- [ ] `site/src/content.config.ts` — `blog`, `updates`, `authors` collections
- [ ] `site/src/pages/blog/index.astro` and `[...slug].astro`
- [ ] `site/src/pages/updates/index.astro` and `repos/[id].astro`
- [ ] Client-side tag filtering: querystring, history, `aria-live` count, no-JS fallback
- [ ] `site/src/layouts/BlogPost.astro`, prose styles
- [ ] Extract `ThemeScript.astro` — the theme-sync script is currently duplicated
      between `index.astro` and `Legal.astro` and has already drifted once (`theme` vs
      `starlight-theme`, silently ignoring the visitor's choice). Two more copies would
      make it four.
- [ ] A shared `SiteHeader` (Projects · Blog · Updates) on every surface
- [ ] Second checkout in `deploy.yml`; accept the `repository_dispatch`
- [ ] `pnpm content:sync`; gitignore `site/src/external`
- [ ] `zod` dependency pinned to Astro's

## Phase 2

`/rss.xml` and a separate `/updates.xml` — people who want release-level noise and
people who want essays are different subscribers. Then per-post OG images,
`@astrojs/sitemap`, `/blog/authors/<id>` archives, `BlogPosting` JSON-LD, and blog tags
if the post count justifies them.

## Still open

- Blog and Updates links in `@rxova/brand`'s `ProjectSwitcher`, so docs pages at
  `/packages/*` link back. Separate brand release; not a phase 1 blocker.
- `SOURCE_ARTIFACTS_TOKEN` must reach `rxova/brand` with `actions:read`. It already
  exists for the docs ingest; brand may need adding to its scope.
- The initial update tag vocabulary.
