#!/usr/bin/env node
// Assemble the combined rxova.org site from downloaded build artifacts.
//
// Usage: node scripts/assemble.mjs [artifactsDir=artifacts] [outDir=_site]
//
// Layout of `artifactsDir` (as produced by actions/download-artifact@v4 with no
// name — one folder per artifact):
//   artifacts/landing/        <- Astro `site/dist` (the landing page)
//   artifacts/docs-journey/   <- journey `apps/docs/build`, built with base /packages/journey/
//   artifacts/docs-react-inputs/ <- react-inputs docs, built with base /packages/react-inputs/ (optional)
//
// Mounts are data-driven from sources.json (via scripts/registry.mjs) so adding a
// project is a config change, not a code change. Each source's uploaded artifact
// must already be laid out to match its `base` URL — the aggregator only relocates
// it under `mount`, it never rewrites asset paths.

import { cp, mkdir, access, rm } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadRegistry, enabledSources } from './registry.mjs'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const [, , artifactsDir = 'artifacts', outDir = '_site'] = process.argv

async function exists(p) {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

async function copyInto(src, dest, { label }) {
  if (!(await exists(src))) return false
  await mkdir(dirname(dest) === dest ? dest : dirname(dest), { recursive: true })
  await mkdir(dest, { recursive: true })
  await cp(src, dest, { recursive: true })
  console.log(`  ✓ ${label}: ${src} -> ${dest}`)
  return true
}

async function main() {
  const config = loadRegistry(join(repoRoot, 'sources.json'))

  // Fresh output tree.
  await rm(outDir, { recursive: true, force: true })
  await mkdir(outDir, { recursive: true })

  console.log(`Assembling site -> ${outDir}`)

  // 1. Landing at root (required).
  const landing = config.landing ?? { artifact: 'landing', mount: '.' }
  const landingSrc = join(artifactsDir, landing.artifact)
  const landingOk = await copyInto(landingSrc, join(outDir, landing.mount), {
    label: 'landing',
  })
  if (!landingOk) {
    console.error(`ERROR: landing artifact missing at ${landingSrc}`)
    process.exit(1)
  }

  // 2. Each enabled docs source under its mount.
  //
  // Disabled projects are simply absent from this list, so there is nothing to
  // tolerate: an enabled project whose artifact never arrived means its build
  // job failed to upload, and deploying anyway would quietly publish a site with
  // that project's docs missing and its landing link 404ing. Fail instead.
  //
  // This is stricter than it used to be, and can afford to be: gating now lives
  // in sources.json where this script can read it, rather than in repo variables
  // that only the workflow could see.
  const missing = []
  for (const s of enabledSources(config)) {
    const src = join(artifactsDir, s.artifact)
    const ok = await copyInto(src, join(outDir, s.mount), { label: s.id })
    if (!ok) missing.push(`${s.id} (expected ${src})`)
  }

  if (missing.length > 0) {
    console.error(`ERROR: enabled project(s) with no artifact:\n  - ${missing.join('\n  - ')}`)
    console.error('Either the build job failed, or the project should be disabled in sources.json.')
    process.exit(1)
  }

  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
