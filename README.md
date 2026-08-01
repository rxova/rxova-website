# rxova-website

The landing page for [rxova.org](https://rxova.org) **and** the docs aggregator that
publishes the whole site.

`rxova.org` is one static site on **GitHub Pages** (its DNS lives in AWS Route 53, but
serving is GitHub Pages). This repo is the only thing that publishes it. It builds the Astro
landing at `/`, gathers each project's already-built docs from its content release, stitches
everything into one tree under a subpath, and deploys to GitHub Pages.

It does **not** build anyone's docs. Each project builds its own docs in its own CI and sends
them here already built; this repo validates and publishes them. See
[docs/INPUTS-CONTRACT.md](docs/INPUTS-CONTRACT.md).

```
rxova.org/                         -> site/  (Astro landing, built here)
rxova.org/packages/journey/        -> rxova/journey        docs (built there, persisted as content-journey)
rxova.org/packages/react-inputs/   -> rxova/react-inputs   docs (built there, persisted as content-react-inputs)
rxova.org/packages/use-everywhere/ -> rxova/use-everywhere docs (built there, persisted as content-use-everywhere)
```

Which projects are mounted is `sources.json` — see [Adding a project](#adding-a-project).

## Layout

| Path                           | What                                                    |
| ------------------------------ | ------------------------------------------------------- |
| `site/`                        | Astro landing page (builds to `site/dist`)              |
| `scripts/registry.mjs`         | Reads/validates `sources.json`; derives every path      |
| `scripts/ingest.mjs`           | Gate 2: validates a sender's dispatch and its dist      |
| `scripts/fetch-docs.mjs`       | Deploy-time: pulls persisted docs from content releases |
| `scripts/assemble.mjs`         | Copies the gathered docs into the final `_site/` tree   |
| `scripts/sitemap.mjs`          | Root sitemap index + `robots.txt` for the whole tree    |
| `scripts/redirects.mjs`        | Static stubs for URLs that used to exist                |
| `scripts/html.mjs`             | parse5 helpers shared by the readers of built HTML      |
| `scripts/*.test.mjs`           | Tests for all of the above — `pnpm test`                |
| `sources.json`                 | **The project registry** — one entry per project        |
| `redirects.json`               | **Legacy URL map** — old path → where it lives now      |
| `docs/INPUTS-CONTRACT.md`      | What a source repo must send (gate 1)                   |
| `.github/workflows/ingest.yml` | validate → persist → deploy, on a docs dispatch         |
| `.github/workflows/deploy.yml` | build landing → gather → assemble → Pages deploy        |
| `build/`                       | Private planning docs (git-ignored)                     |

Every question the deploy asks about a project — where it lives, whether it is on, where it
mounts, which release holds its docs — is answered by `sources.json` through
`scripts/registry.mjs`. Neither `deploy.yml` nor `ingest.yml` holds per-project knowledge or
changes when a project is added, enabled or disabled.

## Develop the landing

```sh
pnpm install
pnpm dev            # http://localhost:4321
pnpm build          # -> site/dist
pnpm preview
```

## How a project's docs reach rxova.org

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

2. **Gate 2 — this repo validates and persists** (`ingest.yml` + `scripts/ingest.mjs`). It
   checks the metadata (known & enabled project, base matches the mount, ref/sha/run_id are
   what they claim), downloads the `docs-dist` artifact from that run, checks it is a real
   docs tree (`index.html` at its root), then stores it as the project's canonical release
   asset (`docs-<id>.tgz` on tag `content-<id>`) and redeploys.

A rejection at either gate fails the ingest and **leaves the live site untouched** — a bad
push can't take rxova.org down, it just doesn't publish.

At deploy time `scripts/fetch-docs.mjs` pulls every _enabled_ project's persisted docs from
its content release and assembles the whole tree (Pages publishes a whole tree, so every
mounted project must be present). Only the project that just changed is re-persisted; the rest
are served from their last persisted dist — nothing is rebuilt here.

## How rxova.org is found

Being assembled from independently built trees has one cost a single site does not pay:
nothing has the whole picture. Each Starlight docs site emits a perfectly good
`sitemap-index.xml` for its own subtree, but a crawler that has never seen those files
cannot use them. So the last two steps of the assemble know things no single project does:

- `scripts/redirects.mjs` writes a stub for every entry in `redirects.json`, since GitHub
  Pages serves files rather than redirect rules. It **fails the deploy** on a target that is
  not in the tree — a redirect into a 404 is worse than the 404 it replaced.
- `scripts/sitemap.mjs` writes `/sitemap-index.xml`, `/sitemap-pages.xml` and `/robots.txt`.
  A project that ships its own sitemap is _referenced_ (it knows its own subtree best); one
  that ships none is swept into `sitemap-pages.xml`. Either way, adding a project costs no
  code change here. `noindex` pages, redirect stubs and `404.html` are never listed.

Submit `https://rxova.org/sitemap-index.xml` once in Google Search Console; every project
reached from it is discovered from then on, including projects added later.

## Adding a project

Two entries, no workflow changes.

1. **In [`rxova/brand`](https://github.com/rxova/brand)** — add the project to `PROJECTS` in
   `src/sites.ts` (the docs sites read it for their project switcher), run `pnpm og` to
   generate its social card, publish, and bump `@rxova/brand` in `site/package.json` here.
2. **In this repo** — add one entry to `sources.json`:

   ```jsonc
   {
     "id": "foo", // must match the brand PROJECTS id
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

`enabled: false` keeps a project listed on the landing but drops its Docs link and makes gate 2
reject its dispatch — use it for a project whose docs aren't ready yet.

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
absent from the published tree. The tests in `scripts/*.test.mjs` cover those paths — including
gate 2's rejections and `checkDist` against real directories on disk — so a regression fails on
the pull request instead of on rxova.org.

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
- **Cutover (Phase 3):** set variable `PAGES_CUSTOM_DOMAIN=rxova.org`, set the custom domain in
  Settings → Pages, and remove it from the journey repo's Pages settings. Route 53 is untouched —
  it already points at GitHub Pages.

### Required GitHub config (Settings → Secrets and variables → Actions)

**Variables:**

- `PAGES_CUSTOM_DOMAIN` — set to `rxova.org` at cutover; leave unset before (serves at default URL).

Per-project gating used to live here as `JOURNEY_ENABLED` / `INPUTS_ENABLED` /
`USE_EVERYWHERE_ENABLED`. It now lives in `sources.json` (`"enabled": true`), so which
projects the site ships is reviewable in a PR instead of being invisible repo state. Those
three variables are no longer read and can be deleted.

**Secrets:**

- `SOURCE_ARTIFACTS_TOKEN` (this repo) — a fine-grained PAT with **Actions: read** on the
  source repos, used by `ingest.yml` to download a sender's `docs-dist` artifact from its run.

Each **source repo** needs a secret `AGGREGATOR_DISPATCH_TOKEN` (a fine-grained PAT with
**Contents: write** on `rxova/rxova-website`) to fire the `docs` dispatch. See
[docs/INPUTS-CONTRACT.md](docs/INPUTS-CONTRACT.md#tokens).
