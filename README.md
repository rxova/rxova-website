# rxova-website

The landing page for [rxova.org](https://rxova.org) **and** the docs aggregator that
publishes the whole site.

`rxova.org` is one static site on **GitHub Pages** (its DNS lives in AWS Route 53, but
serving is GitHub Pages). This repo is the only thing that publishes it. It builds the Astro
landing at `/`, checks out each project and builds its docs (Astro/Starlight or Docusaurus)
under a subpath, stitches everything into one tree, and deploys to GitHub Pages.

```
rxova.org/                      -> site/  (Astro landing)
rxova.org/packages/journey/     -> rxova/journey  apps/docs (built with base /packages/journey/)
rxova.org/packages/react-inputs/ -> rxova/react-inputs   docs   (built with base /packages/react-inputs/)
rxova.org/packages/use-everywhere/ -> rxova/use-everywhere docs  (built with base /packages/use-everywhere/)
```

Which projects are mounted is `sources.json` — see [Adding a project](#adding-a-project).

## Layout

| Path                           | What                                                |
| ------------------------------ | --------------------------------------------------- |
| `site/`                        | Astro landing page (builds to `site/dist`)          |
| `scripts/registry.mjs`         | Reads/validates `sources.json`; derives every path  |
| `scripts/matrix.mjs`           | Turns the registry into the deploy build matrix     |
| `scripts/resolve-output.mjs`   | Finds the directory a project's docs build produced |
| `scripts/assemble.mjs`         | Copies build artifacts into the final `_site/` tree |
| `scripts/*.test.mjs`           | Tests for all of the above — `pnpm test`            |
| `sources.json`                 | **The project registry** — one entry per project    |
| `.github/workflows/deploy.yml` | build → assemble → GitHub Pages deploy              |
| `build/`                       | Private planning docs (git-ignored)                 |

Every question the deploy asks about a project — where it lives, at which ref, how it
builds, where its build lands, where it mounts — is answered by `sources.json` through
`scripts/registry.mjs`. `deploy.yml` holds no per-project knowledge and does not change
when a project is added, migrated, enabled or disabled.

## Develop the landing

```sh
pnpm install
pnpm dev            # http://localhost:4321
pnpm build          # -> site/dist
pnpm preview
```

## How a project's docs reach rxova.org

The source repos never touch the bucket. On push to their `main`, they send a
`repository_dispatch` event to this repo; this repo's workflow then checks them out, builds
their docs with the right `baseUrl`, and deploys the combined site. See
[`build/INPUTS-CONTRACT.md`](build/INPUTS-CONTRACT.md) for what a docs repo must expose.

The dispatch payload is:

```jsonc
{
  "event_type": "docs",
  "client_payload": { "project": "use-everywhere", "ref": "<sha>" },
}
```

Every _enabled_ project is rebuilt on every run — GitHub Pages publishes a whole tree, so a
partial build would drop the other projects' docs from the site. Only the dispatching project
is built at the ref it sent; the rest build their `sources.json` ref.

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
     "build": ["pnpm docs:build"],
     "landing": { "blurb": "…", "tags": ["React", "TypeScript"] },
   }
   ```

Everything else is derived from `id`: the docs build at `/packages/foo/`, mount at
`_site/packages/foo`, upload as artifact `docs-foo`, and appear on the landing with Docs,
GitHub and npm links. The deploy workflow picks the project up automatically.

`output` is optional — `apps/docs/dist` (Astro/Starlight) then `apps/docs/build` (Docusaurus)
are tried in order and whichever the build produced is uploaded. Set it only for docs that
live somewhere non-standard.

`enabled: false` keeps a project listed on the landing but drops its Docs link and skips its
build — use it for a project whose docs aren't ready yet.

### Checking your entry

```sh
pnpm check:registry   # validate sources.json
pnpm matrix           # print the build matrix it produces
pnpm test             # the registry, matrix, output resolution and assembly
```

All three run in CI, along with a build-time check that `sources.json` and the brand package
describe the same set of projects — they cannot silently drift apart.

`pnpm test` is worth its own note. The registry pipeline otherwise only runs during a
deploy, where its mistakes are already live and often quiet: a dispatch that builds the
wrong ref, an artifact copied to a mount that disagrees with the base URL the docs were
built with, a project whose docs are silently absent from the published tree. The tests in
`scripts/*.test.mjs` cover those paths against real directories on disk, so a regression
fails on the pull request instead of on rxova.org.

## Migrating a project's docs to Astro

`use-everywhere` has moved from Docusaurus to Astro/Starlight; `journey` and `react-inputs`
will follow. Two things change when a project migrates, and only one of them is automatic.

**The output directory — handled for you.** Docusaurus emits `build/`, Astro emits `dist/`.
`sources.json` no longer pins one path: `scripts/resolve-output.mjs` runs on the runner after
the build and picks whichever candidate the build actually filled in, preferring `dist/`. So
nothing here needs editing. The first migration did break the deploy this way (`No files were
found with the provided path: use-everywhere/apps/docs/build`) before that existed.

A build that produced nothing now fails at that step with the candidates it tried, what is
actually on disk, and the knob to turn — rather than at upload, with a path and no context.

**Mermaid diagrams — needs one line.** If the docs render mermaid through `rehype-mermaid`,
it drives headless chromium at build time, and the browser must be installed in _this_ repo's
build too — not just in the project's own CI. Without it the build produces nothing to upload
and the deploy fails. Add the install between the library build and the docs build:

```jsonc
"build": [
  "pnpm --filter @scope/core build",
  "pnpm --filter @scope/docs exec playwright install --with-deps chromium",
  "pnpm --filter @scope/docs build",
]
```

Unchanged by a migration: the `DOCS_URL` / `DOCS_BASE_URL` contract. Astro reads them the same
way Docusaurus did — `base: process.env.DOCS_BASE_URL ?? '/'` — and the docs must still build
at `/packages/<id>/`, because the aggregator only relocates the tree and never rewrites asset
paths.

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

Each **source repo** needs a secret `AGGREGATOR_DISPATCH_TOKEN` (a fine-grained PAT with
Contents: write on `rxova/rxova-website`) to fire the rebuild.
