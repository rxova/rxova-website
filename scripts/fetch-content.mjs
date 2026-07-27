#!/usr/bin/env node
// Unpack the persisted prose into the tree the Astro build reads.
//
// Usage: node scripts/fetch-content.mjs [dest=site/src/external]
//
// `/blog` and `/updates` are rendered from markdown written in rxova/brand. That
// repo packages the prose plus the schema that validates it and sends it here (see
// its publish-content.yml); ingest-content.yml validates what arrives and persists
// it as the release asset below. This script pulls it back at build time.
//
// The release lives in *this* repo, so `gh` authenticates with the built-in
// GITHUB_TOKEN. That is the whole reason for the round trip: the website used to
// check brand out directly, which meant holding a read token for a private repo and
// meant a pull request from a fork — which gets no secrets — could not build at all.
//
// A missing release is fatal. Falling back to whatever happens to be on disk would
// publish a silently stale blog, which is worse than a red deploy: nothing about
// the site would tell you it had stopped updating.

import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, mkdirSync, existsSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Tag and asset that ingest-content.yml writes. Both sides must agree. */
export const CONTENT_RELEASE = 'content-prose'
export const CONTENT_ASSET = 'content-dist.tgz'

/** What the tarball must contain to be worth unpacking. */
export const REQUIRED_PATHS = [
  'content/posts',
  'content/updates',
  'content/authors',
  'packages/content-schema/src/index.ts',
  'packages/brand/src/sites.ts',
]

/**
 * Everything the unpacked tree must have for `astro build` to succeed.
 *
 * Checked after extraction rather than trusted, because the failure it prevents is
 * miserable to debug from the other end: a tarball missing the schema fails as an
 * unresolvable import inside Astro's content-collection sync, which reads like a
 * bug in this repo rather than a bad artifact.
 */
export function missingPaths(dest, exists = existsSync) {
  return REQUIRED_PATHS.filter((p) => !exists(join(dest, p)))
}

export function downloadRelease(tmp, run = execFileSync) {
  run('gh', ['release', 'download', CONTENT_RELEASE, '--pattern', CONTENT_ASSET, '--dir', tmp], {
    stdio: ['ignore', 'inherit', 'inherit'],
  })
}

export async function fetchContent(dest, deps = {}) {
  const { run = execFileSync, exists = existsSync } = deps
  const tmp = mkdtempSync(join(tmpdir(), 'rxova-content-'))

  try {
    try {
      downloadRelease(tmp, run)
    } catch {
      throw new Error(
        `no persisted content (release ${CONTENT_RELEASE} / ${CONTENT_ASSET}).\n` +
          'Nothing has been ingested yet, or the release was deleted.\n' +
          'Re-run "Publish content" in rxova/brand to send it again.',
      )
    }

    // Replace rather than merge: a stale post deleted upstream must disappear here
    // too, and merging would leave it published forever.
    rmSync(dest, { recursive: true, force: true })
    mkdirSync(dest, { recursive: true })
    run('tar', ['-xzf', join(tmp, CONTENT_ASSET), '-C', dest], { stdio: 'inherit' })

    const missing = missingPaths(dest, exists)
    if (missing.length > 0) {
      throw new Error(
        `the persisted content is missing:\n  - ${missing.join('\n  - ')}\n` +
          'The artifact rxova/brand uploaded is not the shape this expects.',
      )
    }

    const posts = readdirSync(join(dest, 'content/posts')).filter((n) => n.endsWith('.md')).length
    const updates = readdirSync(join(dest, 'content/updates')).filter((n) =>
      n.endsWith('.md'),
    ).length
    console.log(`Content unpacked into ${dest} — ${posts} post(s), ${updates} update(s).`)
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
}

// Only run as a CLI; the tests import the functions above.
if (import.meta.filename === process.argv[1]) {
  const args = process.argv.slice(2)
  const dest = join(repoRoot, args.find((a) => !a.startsWith('--')) ?? 'site/src/external')

  // `--if-missing` is what the site's predev/prebuild use: CI and deploy have
  // already fetched by then, and re-downloading on every build is pure waste.
  // Running `pnpm content:sync` directly always refetches.
  if (args.includes('--if-missing') && existsSync(join(dest, 'content'))) {
    console.log(`Content already at ${dest} — skipping fetch.`)
    process.exit(0)
  }

  fetchContent(dest).catch((err) => {
    console.error(`ERROR: ${err.message}`)
    process.exit(1)
  })
}
