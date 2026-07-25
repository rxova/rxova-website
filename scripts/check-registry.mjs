#!/usr/bin/env node
// Fail CI when sources.json is malformed, before a bad entry reaches a deploy.
//
// This is the structural half of the registry check: ids, build commands,
// output paths, ref syntax, duplicate ids — everything `loadRegistry` enforces.
//
// The other half — that sources.json and @rxova/brand's PROJECTS describe the
// same set of projects — is asserted inside the Astro build instead, by
// site/src/lib/projects.ts. That check needs to import the brand package, whose
// TypeScript source Node cannot load from node_modules; Vite can, so the landing
// build is the natural place for it. `pnpm build` runs in CI, so both halves are
// covered on every pull request.

import { loadRegistry, enabledSources } from './registry.mjs'

try {
  const registry = loadRegistry()
  const enabled = enabledSources(registry)

  console.log(`sources.json OK — ${registry.sources.length} project(s), ${enabled.length} enabled:`)
  for (const s of registry.sources) {
    console.log(`  ${s.enabled ? '✓' : '–'} ${s.id.padEnd(16)} ${s.repo} -> ${s.base}`)
  }

  if (enabled.length === 0) {
    console.log('\nNote: no projects are enabled; the site will deploy as landing-only.')
  }
} catch (err) {
  console.error(`ERROR: ${err.message}`)
  process.exit(1)
}
