# rxova-website

The landing page for [rxova.org](https://rxova.org) **and** the docs aggregator that
publishes the whole site.

`rxova.org` is one static site on **GitHub Pages** (its DNS lives in AWS Route 53, but
serving is GitHub Pages). This repo is the only thing that publishes it. It builds the Astro
landing at `/`, checks out each project and builds its Docusaurus docs under a subpath,
stitches everything into one tree, and deploys to GitHub Pages.

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
| `scripts/assemble.mjs`         | Copies build artifacts into the final `_site/` tree |
| `scripts/registry.mjs`         | Reads/validates `sources.json`; derives every path  |
| `scripts/matrix.mjs`           | Turns the registry into the deploy build matrix     |
| `sources.json`                 | **The project registry** — one entry per project    |
| `.github/workflows/deploy.yml` | build → assemble → GitHub Pages deploy              |
| `build/`                       | Private planning docs (git-ignored)                 |

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
     "output": "apps/docs/build",
     "landing": { "blurb": "…", "tags": ["React", "TypeScript"] },
   }
   ```

Everything else is derived from `id`: the docs build at `/packages/foo/`, mount at
`_site/packages/foo`, upload as artifact `docs-foo`, and appear on the landing with Docs,
GitHub and npm links. The deploy workflow picks the project up automatically.

`enabled: false` keeps a project listed on the landing but drops its Docs link and skips its
build — use it for a project whose docs aren't ready yet.

Run `pnpm check:registry` to validate the file and `pnpm matrix` to see the build matrix it
produces. Both run in CI, along with a build-time check that `sources.json` and the brand
package describe the same set of projects — they cannot silently drift apart.

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
