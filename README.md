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
rxova.org/packages/inputs/      -> rxova/inputs   docs      (built with base /packages/inputs/)
```

`use-everywhere` is not mounted here yet — the landing links out to its existing docs.

## Layout

| Path                        | What                                                          |
| --------------------------- | ------------------------------------------------------------ |
| `site/`                     | Astro landing page (builds to `site/dist`)                   |
| `scripts/assemble.mjs`      | Copies build artifacts into the final `_site/` tree          |
| `sources.json`              | Which projects get mounted, and where                        |
| `.github/workflows/deploy.yml` | build → assemble → GitHub Pages deploy                    |
| `build/`                    | Private planning docs (git-ignored)                          |

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
[`build/INPUTS-CONTRACT.md`](build/INPUTS-CONTRACT.md) for what the inputs monorepo must expose.

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

**Variables:** `PAGES_CUSTOM_DOMAIN` (set to `rxova.org` at cutover; leave unset before). To turn
on inputs: `INPUTS_ENABLED=true` (and optionally `INPUTS_REPO`).

Each **source repo** needs a secret `AGGREGATOR_DISPATCH_TOKEN` (a fine-grained PAT with
Contents: write on `rxova/rxova-website`) to fire the rebuild.
