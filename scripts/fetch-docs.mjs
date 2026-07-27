#!/usr/bin/env node
// Deploy-time counterpart to ingest: pull every enabled project's persisted docs
// out of its content release and lay them out where assemble.mjs expects them.
// No project is built here — the aggregator only ever moves already-built trees.
//
// Usage: node scripts/fetch-docs.mjs [artifactsDir=artifacts]
//
// For each enabled source it downloads the release asset docs-<id>.tgz from tag
// content-<id> and extracts it to <artifactsDir>/docs-<id>/ (which is
// <artifactsDir>/<source.artifact>, i.e. exactly where assemble.mjs reads it).
//
// A missing release is fatal. An enabled project with nothing persisted is a hole
// in the site — either it was never ingested, or it should be disabled — the same
// failure assemble.mjs refuses at the next step, surfaced here with the release it
// looked for so the fix is obvious.

import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadRegistry, enabledSources } from './registry.mjs'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * What to download for each enabled project, and where to put it. Pure, so the
 * mapping (enabled ids -> release tag/asset/dest) is testable without invoking gh.
 */
export function fetchPlan(registry) {
  return enabledSources(registry).map((s) => ({
    id: s.id,
    tag: s.releaseTag,
    asset: s.releaseAsset,
    // == s.artifact; assemble.mjs reads artifacts/<artifact>.
    dest: s.artifact,
  }))
}

function download(plan, artifactsDir) {
  const dest = join(artifactsDir, plan.dest)
  mkdirSync(dest, { recursive: true })

  const tmp = mkdtempSync(join(tmpdir(), `fetch-${plan.id}-`))
  try {
    execFileSync('gh', ['release', 'download', plan.tag, '--pattern', plan.asset, '--dir', tmp], {
      stdio: 'pipe',
    })
  } catch (err) {
    const detail = err.stderr?.toString?.().trim() || err.message
    throw new Error(
      `no persisted docs for "${plan.id}" (release ${plan.tag} / ${plan.asset}).\n` +
        'Either it was never ingested, or it should be disabled in sources.json.\n' +
        detail,
      { cause: err },
    )
  }
  execFileSync('tar', ['-xzf', join(tmp, plan.asset), '-C', dest], { stdio: 'pipe' })
  console.log(`  ✓ ${plan.id}: ${plan.tag} / ${plan.asset} -> ${dest}`)
}

function main(argv) {
  const artifactsDir = argv[0] || 'artifacts'
  const plans = fetchPlan(loadRegistry(join(repoRoot, 'sources.json')))

  if (plans.length === 0) {
    console.log('No enabled projects; landing-only deploy, nothing to fetch.')
    return
  }

  mkdirSync(artifactsDir, { recursive: true })
  console.log(`Fetching persisted docs -> ${artifactsDir}`)
  for (const plan of plans) download(plan, artifactsDir)
  console.log('Done.')
}

// Only run as a CLI; the tests import `fetchPlan` above.
if (import.meta.filename === process.argv[1]) {
  try {
    main(process.argv.slice(2))
  } catch (err) {
    console.error(`ERROR: ${err.message}`)
    process.exit(1)
  }
}
