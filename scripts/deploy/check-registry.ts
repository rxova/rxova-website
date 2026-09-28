#!/usr/bin/env node
// Fails CI when sources.json breaks anything `loadRegistry` enforces, or deploys a project that
// @rxova/brand's PROJECTS (the one list of projects) does not name.

// By path, like validate-content: this runs under bare Node, before anything is built.
import { PROJECTS } from '../../packages/brand/src/sites.ts'
import { errorMessage } from '@rxova/ts-utils'
import { loadRegistry, enabledSources, type Registry, type Source } from '../lib/registry.ts'

const STORYBOOK_PREFIX = 'storybook-'

/** The sources that deploy a project brand does not list: a package, or a project's Storybook. */
export function unknownProjects(
  sources: readonly Pick<Source, 'id' | 'kind'>[],
  projectIds: readonly string[],
): string[] {
  return sources
    .filter((s) => s.kind !== 'site')
    .filter((s) => {
      const project = s.kind === 'storybook' ? s.id.slice(STORYBOOK_PREFIX.length) : s.id
      return !projectIds.includes(project)
    })
    .map((s) => s.id)
}

export interface CheckRegistryOptions {
  load?: () => Pick<Registry, 'sources'>
  projectIds?: readonly string[]
  log?: (message: string) => void
  error?: (message: string) => void
}

/** Prints the registry and returns the exit code: 1 when it does not load. */
export function checkRegistry({
  load = loadRegistry,
  projectIds = PROJECTS.map((p) => p.id),
  log = console.log,
  error = console.error,
}: CheckRegistryOptions = {}): number {
  try {
    const registry = load()
    const enabled = enabledSources(registry)

    const unknown = unknownProjects(registry.sources, projectIds)
    if (unknown.length > 0) {
      error(
        `ERROR: sources.json deploys ${unknown.map((id) => `"${id}"`).join(', ')}, ` +
          `which @rxova/brand's PROJECTS does not list. Add the project there first.`,
      )
      return 1
    }

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
