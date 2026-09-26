#!/usr/bin/env node
// Fail CI when sources.json is malformed, before a bad entry reaches a deploy.
//
// This is the structural half of the registry check: id syntax, duplicate ids,
// derived paths that agree with themselves — everything `loadRegistry` enforces.
//
// The other half — that sources.json and @rxova/brand's PROJECTS describe the
// same set of projects — is asserted inside the Astro build instead, by
// apps/landing/src/lib/projects.ts. That check needs to import the brand package, whose
// TypeScript source Node cannot load from node_modules; Vite can, so the landing
// build is the natural place for it. `pnpm build` runs in CI, so both halves are
// covered on every pull request.

import { errorMessage } from '../lib/errors.ts'
import { loadRegistry, enabledSources, type Registry } from '../lib/registry.ts'

export interface CheckRegistryOptions {
  load?: () => Pick<Registry, 'sources'>
  log?: (message: string) => void
  error?: (message: string) => void
}

/** Prints the registry and returns the exit code: 1 when it does not load. */
export function checkRegistry({
  load = loadRegistry,
  log = console.log,
  error = console.error,
}: CheckRegistryOptions = {}): number {
  try {
    const registry = load()
    const enabled = enabledSources(registry)

    log(`sources.json OK — ${registry.sources.length} project(s), ${enabled.length} enabled:`)
    for (const s of registry.sources) {
      log(`  ${s.enabled ? '✓' : '–'} ${s.id.padEnd(16)} ${s.repo} -> ${s.base}`)
    }

    if (enabled.length === 0) {
      log('\nNote: no projects are enabled; the site will deploy as landing-only.')
    }
    return 0
  } catch (err) {
    error(`ERROR: ${errorMessage(err)}`)
    return 1
  }
}

/* v8 ignore start -- entry point; `pnpm check:registry` is what runs it */
if (import.meta.main) process.exitCode = checkRegistry()
/* v8 ignore stop */
