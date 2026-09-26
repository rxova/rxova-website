#!/usr/bin/env node
// Fails CI when sources.json breaks anything `loadRegistry` enforces (ids, derived paths).
// Its match with @rxova/brand's PROJECTS is checked in apps/landing/src/lib/projects.ts.

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
