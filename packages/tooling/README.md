# @rxova/repo-tooling

Private tooling for this repo. It is not published.

## Behaviour lock

Proves that a change doesn't change what the site ships.

```sh
pnpm lock:diff               # compare the working tree with main
pnpm lock:diff --base <ref>  # …or with any other ref
pnpm lock:snapshot [out]     # snapshot the working tree only
```

It builds both sides the same way CI and the deploy do: the landing, the preview app, and the blog and updates for their mounts. It then assembles `_site`, using small stand-in page bundles for the docs that live in other repos. The base side is built in a throwaway git worktree, and its snapshot is cached per commit.

Each snapshot holds:

- **every page:** its markup, and its CSS combined into one sheet in the order it applies
- **every other text output:** sitemaps, `llms.txt`, feeds, redirect stubs
- **an asset list:** binaries with a content hash; scripts and stylesheets by name only
- **published packages:** the `npm pack` file list and `exports` of each

Hashed asset names, Astro's scope ids and comments are masked, and the output is formatted with Prettier, so only real changes show. The full diff is written to `.lock/diff.patch`.

## End-to-end specs

```sh
pnpm e2e      # behaviour specs in Chromium, as CI runs them
pnpm visual   # local screenshot comparison; add --update-snapshots on main for a baseline
```

Both build and assemble the site like the deploy does (`src/e2e/serve.ts`), then serve `_site` on port 4480. The specs in `e2e/` cover the interactive parts: the project rail's tabs, the walkthrough tour, the theme toggle, the updates filters and batching, and the blog. The visual project screenshots 5 routes × 3 widths × 2 themes into the gitignored `.lock/visual`.
