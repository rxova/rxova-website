#!/usr/bin/env node
// Put a checkout of rxova/brand where the Astro build expects to find it.
//
// Usage: node scripts/sync-content.mjs [dest=site/src/external]
//
// `/blog` and `/changelog` are rendered from markdown that lives in the brand
// monorepo, alongside the schema that validates it (see docs/CONTENT-ARCHITECTURE.md).
// CI does this with an `actions/checkout` step; this script is the local
// equivalent so `pnpm dev` shows real content instead of an empty index.
//
// Clones on first run, pulls after that. Brand is a private repo, so this relies
// on your existing git credentials — the same ones that let you clone it by hand.

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

const REMOTE = process.env.BRAND_REMOTE ?? 'git@github.com:rxova/brand.git'
const BRANCH = process.env.BRAND_REF ?? 'main'

function git(args, cwd) {
  return execFileSync('git', args, { cwd, stdio: ['ignore', 'pipe', 'inherit'] })
    .toString()
    .trim()
}

const args = process.argv.slice(2)
// `--if-missing` is what `predev` / `prebuild` use: clone if there is nothing
// there, otherwise leave it alone. In CI the checkout step has already placed it,
// and re-fetching it on every build would be pure waste. Running the script
// directly (`pnpm content:sync`) always pulls.
const ifMissing = args.includes('--if-missing')
const dest = join(repoRoot, args.find((a) => !a.startsWith('--')) ?? 'site/src/external')

if (ifMissing && existsSync(join(dest, 'content'))) {
  console.log(`Content already at ${dest} — skipping sync.`)
  process.exit(0)
}

try {
  if (existsSync(join(dest, '.git'))) {
    console.log(`Updating ${dest} …`)
    git(['fetch', '--depth', '1', 'origin', BRANCH], dest)
    git(['checkout', '--force', 'FETCH_HEAD'], dest)
  } else {
    console.log(`Cloning ${REMOTE} (${BRANCH}) -> ${dest} …`)
    mkdirSync(dirname(dest), { recursive: true })
    git(['clone', '--depth', '1', '--branch', BRANCH, REMOTE, dest], repoRoot)
  }
} catch {
  // execFileSync already forwarded git's stderr, so do not repeat it — just say
  // what it was for and what to do, which git cannot know.
  console.error(
    `\nCould not sync content from ${REMOTE}.\n` +
      'It is a private repo, so this needs git credentials with read access.\n' +
      'Without it `pnpm dev` will build with no posts, which is fine for landing work.',
  )
  process.exit(1)
}

const sha = git(['rev-parse', '--short', 'HEAD'], dest)
console.log(`Content at ${sha}.`)
