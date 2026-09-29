# rxova-website

The site for [rxova.dev](https://rxova.dev) (the landing, the blog and the updates stream, as one
Astro app), the docs aggregator that publishes the whole domain, and the design system every page
is built from.

`rxova.dev` is one static site on **GitHub Pages** (its DNS lives in AWS Route 53, but
serving is GitHub Pages). This repo is the only thing that publishes it. It builds the Astro
site at `/`, gathers each project's already-built docs from its content release, stitches
everything into one tree under a subpath, and deploys to GitHub Pages.

It does **not** build anyone's docs. Each project builds its own docs in its own CI and sends
them here already built; this repo validates and publishes them. See
[docs/INPUTS-CONTRACT.md](docs/INPUTS-CONTRACT.md).

```
rxova.dev/                         -> apps/site          (the site: landing, /about, /blog, /updates)
rxova.dev/packages/journey/        -> rxova/journey        docs (built there, persisted as content-journey)
rxova.dev/packages/react-inputs/   -> rxova/react-inputs   docs (built there, persisted as content-react-inputs)
rxova.dev/packages/use-everywhere/ -> rxova/use-everywhere docs (built there, persisted as content-use-everywhere)
```

Which projects are mounted is `sources.json` — see [Adding a project](#adding-a-project).

## Layout

| Path                               | What                                                    |
| ---------------------------------- | ------------------------------------------------------- |
| `apps/site`                        | The site: landing, /about, /blog, /updates (one app)    |
| `apps/site/content`                | Blog posts, update entries, their images and authors    |
| `packages/brand`                   | `@rxova/brand` on npm: tokens, fonts and project data   |
| `packages/astro-ui`                | `@rxova/astro-ui`: components, Starlight preset, chrome |
| `packages/website-schemas`         | `@rxova/website-schemas` on npm: the content contracts  |
| `apps/preview`                     | A Starlight site that renders `@rxova/brand` for review |
| `scripts/lib/registry.ts`          | Reads/validates `sources.json`; derives every path      |
| `scripts/deploy/ingest.ts`         | Gate 2: validates a sender's dispatch and its dist      |
| `scripts/deploy/fetch-docs.ts`     | Deploy-time: pulls persisted docs from content releases |
| `scripts/deploy/assemble.ts`       | Copies the gathered docs into the final `_site/` tree   |
| `scripts/lib/sitemap.ts`           | Root sitemap index + `robots.txt` for the whole tree    |
| `scripts/lib/redirects.ts`         | Static stubs for URLs that used to exist                |
| `scripts/lib/html.ts`              | parse5 helpers shared by the readers of built HTML      |
| `scripts/**/*.test.*`              | Tests for all of the above — `pnpm test`                |
| `scripts/repo/validate-content.ts` | Pre-merge check of blog and updates frontmatter         |
| `sources.json`                     | **The project registry** — one entry per project        |
| `redirects.json`                   | **Legacy URL map** — old path → where it lives now      |
| `docs/INPUTS-CONTRACT.md`          | What a source repo must send (gate 1)                   |
| `docs/CONTENT.md`                  | How to write a blog post or an update                   |
| `.github/workflows/ingest.yml`     | validate → persist → deploy, on a docs dispatch         |
| `.github/workflows/deploy.yml`     | build the site → gather → assemble → Pages deploy       |
| `build/`                           | Private planning docs (git-ignored)                     |

Every question the deploy asks about a project — where it lives, whether it is on, where it
mounts, which release holds its docs — is answered by `sources.json` through
`scripts/lib/registry.ts`. Neither `deploy.yml` nor `ingest.yml` holds per-project knowledge or
changes when a project is added, enabled or disabled.

## Develop

```sh
pnpm install
pnpm dev                          # the site, http://localhost:4321 (/, /blog, /updates)
pnpm brand:dev                    # the brand preview site
pnpm og                           # re-render the social cards after a palette or tagline change
pnpm run verify                   # the full gate, same list CI runs (also the pre-push hook)
```

`verify` is `rxova-repo-config verify` from [`@rxova/repo-config`](https://github.com/rxova/shared/tree/main/packages/repo-config),
running the steps listed once in `repoConfig.verify.steps` in `package.json`, so the local gate and
CI cannot drift. The ESLint, lint-staged, commitlint, tsconfig, Vitest and Playwright
setups are that package's presets, and CI is built from the
[rxova/shared](https://github.com/rxova/shared) actions and reusable workflows. Writing for the blog or updates: [docs/CONTENT.md](docs/CONTENT.md).

## Releasing the packages

`@rxova/brand` and `@rxova/website-schemas` publish to npm through Changesets, gated on CI
having gone green for the exact commit:

1. `pnpm exec changeset` on your branch. The `changeset present` check requires one when a
   published package changes; label a pull request `skip-changeset` when it publishes nothing.
2. Merge — the Release workflow opens or updates the version PR.
3. Merge that, and the packages publish with provenance.

The **Snapshot** workflow publishes a throwaway `0.x.y-next.N` to the `next` tag for trying an
in-progress change in a real consumer repo.

## How a project's docs reach rxova.dev

Two gates, and the aggregator builds nothing.

1. **Gate 1 — the source repo sends** (its own CI). On push to `main` it builds its docs for
   base `/packages/<id>/`, uploads them as an artifact named `docs-dist`, and fires a `docs`
   `repository_dispatch` naming the run that holds them. Full spec:
   [docs/INPUTS-CONTRACT.md](docs/INPUTS-CONTRACT.md).

   ```jsonc
   {
     "event_type": "docs",
     "client_payload": {
       "schema": 1,
       "project": "use-everywhere",
       "ref": "main",
       "sha": "<sha>",
       "run_id": "<the run holding docs-dist>",
       "base": "/packages/use-everywhere/", // optional; validated if present
       "framework": "astro", //              optional
     },
   }
   ```

2. **Gate 2 — this repo validates and persists** (`ingest.yml` + `scripts/deploy/ingest.ts`). It
   checks the metadata (known & enabled project, base matches the mount, ref/sha/run_id are
   what they claim), downloads the `docs-dist` artifact from that run, checks it is a real
   docs tree (`index.html` at its root), then stores it as the project's canonical release
   asset (`docs-<id>.tgz` on tag `content-<id>`) and redeploys.

A rejection at either gate fails the ingest and **leaves the live site untouched** — a bad
push can't take rxova.dev down, it just doesn't publish.

At deploy time `scripts/deploy/fetch-docs.ts` pulls every _enabled_ project's persisted docs from
its content release and assembles the whole tree (Pages publishes a whole tree, so every
mounted project must be present). Only the project that just changed is re-persisted; the rest
are served from their last persisted dist — nothing is rebuilt here.

## How rxova.dev is found

Being assembled from independently built trees has one cost a single site does not pay:
nothing has the whole picture. Each Starlight docs site emits a perfectly good
`sitemap-index.xml` for its own subtree, but a crawler that has never seen those files
cannot use them. So the last two steps of the assemble know things no single project does:

- `scripts/lib/redirects.ts` writes a stub for every entry in `redirects.json`, since GitHub
  Pages serves files rather than redirect rules. It **fails the deploy** on a target that is
  not in the tree — a redirect into a 404 is worse than the 404 it replaced.
- `scripts/lib/sitemap.ts` writes `/sitemap-index.xml`, `/sitemap-pages.xml` and `/robots.txt`.
  A project that ships its own sitemap is _referenced_ (it knows its own subtree best); one
  that ships none is swept into `sitemap-pages.xml`. Either way, adding a project costs no
  code change here. `noindex` pages, redirect stubs and `404.html` are never listed.

Submit `https://rxova.dev/sitemap-index.xml` once in Google Search Console; every project
reached from it is discovered from then on, including projects added later.

## Adding a project

No workflow changes. `PROJECTS` in `packages/brand/src/sites.ts` is the one list of projects;
`sources.json` only says which of them this site deploys.

1. Add the project to `PROJECTS` (the docs sites read it for their project switcher), run
   `pnpm og` to generate its social card, and add a changeset so the docs sites can pick up the
   new `@rxova/brand`.
2. To put it on rxova.dev, add its entry to `sources.json`:

   ```jsonc
   {
     "id": "foo", // a PROJECTS id; `pnpm check:registry` rejects any other
     "enabled": true,
     "landing": { "blurb": "…", "tags": ["React", "TypeScript"] },
   }
   ```

Everything else is derived from `id`: docs mount at `_site/packages/foo`, persist to release
`content-foo` as `docs-foo.tgz`, and the project appears on the landing with Docs, GitHub and
npm links. Then wire the new repo's sender per
[docs/INPUTS-CONTRACT.md](docs/INPUTS-CONTRACT.md).

There is no `build`/`install`/`output` here — the aggregator never builds the project. How the
docs are built is entirely the source repo's business.

`enabled: false` keeps the entry but takes the project off the landing and makes gate 2 reject
its dispatch — use it for a project whose docs aren't ready yet. A project with no entry at all
is simply not deployed.

### Checking your entry

```sh
pnpm check:registry   # validate sources.json
pnpm test             # the registry, the ingest gates, the fetch plan, and assembly
```

Both run in CI, along with a build-time check that `sources.json` and the brand package
describe the same set of projects — they cannot silently drift apart.

`pnpm test` is worth its own note. This machinery otherwise only runs during an ingest or a
deploy, where its mistakes are already live and often quiet: a dispatch accepted for the wrong
project, a dist mounted where the base URL disagrees with it, a project whose docs are silently
absent from the published tree. The tests in `scripts/**/*.test.*` cover those paths — including
gate 2's rejections and `checkDist` against real directories on disk — so a regression fails on
the pull request instead of on rxova.dev.

## How docs are built (it isn't here)

Each project builds its own docs in its own CI, however suits it — Astro/Starlight, Docusaurus,
mermaid via headless chromium, whatever monorepo filter chain it needs. None of that is this
repo's concern any more: the aggregator only ever receives an already-built tree.

The one invariant a source repo must hold: build for base `/packages/<id>/` (the house
convention is `base: process.env.DOCS_BASE_URL ?? '/'`), because the aggregator relocates the
tree without rewriting asset paths. A build made for the wrong base is rejected at gate 2 (if it
sends `base`) or shows up as a page with every asset 404ing. See
[docs/INPUTS-CONTRACT.md](docs/INPUTS-CONTRACT.md).

## Deploy

Deploys to **GitHub Pages**. Enable Pages for this repo with **Source: GitHub Actions**
(Settings → Pages).

- Until the `PAGES_CUSTOM_DOMAIN` variable is set, the site publishes to the default Pages URL
  (`https://rxova.github.io/rxova-website/`) — a structural smoke test only, since asset paths
  assume the domain root. Do visual QA locally (`pnpm preview`).
- **Cutover (Phase 3):** set variable `PAGES_CUSTOM_DOMAIN=rxova.dev`, set the custom domain in
  Settings → Pages, and remove it from the journey repo's Pages settings. Route 53 is untouched —
  it already points at GitHub Pages.

### Required GitHub config (Settings → Secrets and variables → Actions)

**Variables:**

- `PAGES_CUSTOM_DOMAIN` — set to `rxova.dev` at cutover; leave unset before (serves at default URL).

Per-project gating used to live here as `JOURNEY_ENABLED` / `INPUTS_ENABLED` /
`USE_EVERYWHERE_ENABLED`. It now lives in `sources.json` (`"enabled": true`), so which
projects the site ships is reviewable in a PR instead of being invisible repo state. Those
three variables are no longer read and can be deleted.

**Secrets:**

- `SOURCE_ARTIFACTS_TOKEN` (this repo) — a fine-grained PAT with **Actions: read** on the
  source repos, used by `ingest.yml` to download a sender's `docs-dist` artifact from its run.

Each **source repo** needs a secret `AGGREGATOR_DISPATCH_TOKEN` (a fine-grained PAT with
**Contents: write** on `rxova/rxova-website`) to fire the `docs` dispatch. See
[docs/INPUTS-CONTRACT.md](docs/INPUTS-CONTRACT.md#tokens). The blog and updates are sent from
this repository, so they use the workflow's own token and need neither secret.
