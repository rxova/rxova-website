// The project registry: one place that reads `sources.json`, fills in defaults,
// derives the paths, and refuses to return anything malformed.
//
// Everything that needs to know "what projects make up rxova.org" goes through
// here — `assemble.mjs` (which copies artifacts into the final tree) and
// `matrix.mjs` (which generates the deploy workflow's build matrix). Neither
// re-reads the JSON itself, so there is no second place for the shape of an
// entry to be understood slightly differently.
//
// The landing page does NOT use this module: it consumes `sources.json` through
// a Vite JSON import (see site/src/lib/projects.ts) because Astro builds it in a
// browser-ish module graph where reaching outside the site root with node:fs is
// fragile. It only reads the `landing` copy, which needs no derivation.
//
// ## Derived, not configured
//
// A source declares its `id` and the registry derives every path from it:
//
//   id: "journey"  ->  base:     /packages/journey/     (URL the docs build at)
//                      mount:    packages/journey       (path in the deployed tree)
//                      artifact: docs-journey           (CI artifact name)
//                      workdir:  journey                (checkout dir in CI)
//
// These four used to be written out per project, which meant four chances to
// typo a mount that silently disagrees with the baseUrl the docs were built
// with — a class of bug whose symptom is a live page with every stylesheet 404ing.
// Deriving them makes that disagreement unrepresentable.

import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

export const SOURCES_FILE = join(repoRoot, 'sources.json')

/** Project ids are used in URLs, artifact names and shell paths — keep them boring. */
const ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/

/**
 * Git refs reach us from a `repository_dispatch` payload, i.e. from outside this
 * repo. They are interpolated into workflow YAML, so constrain them to what a
 * branch name or SHA can actually contain rather than trusting the sender.
 */
const REF_PATTERN = /^[A-Za-z0-9._/-]+$/

class RegistryError extends Error {
  constructor(message) {
    super(`sources.json: ${message}`)
    this.name = 'RegistryError'
  }
}

/**
 * Resolve one raw entry into its full form: defaults applied, paths derived.
 * Exported for tests and for anything that wants the derivation without the file.
 */
export function resolveSource(raw, defaults = {}) {
  const id = raw?.id
  if (typeof id !== 'string' || !ID_PATTERN.test(id)) {
    throw new RegistryError(
      `every source needs an "id" of lowercase letters, digits and dashes; got ${JSON.stringify(id)}`,
    )
  }

  const build = Array.isArray(raw.build) ? raw.build : raw.build ? [raw.build] : []
  if (build.length === 0) {
    throw new RegistryError(`"${id}" needs a "build" command (string or array of strings)`)
  }
  if (typeof raw.output !== 'string' || raw.output.length === 0) {
    throw new RegistryError(`"${id}" needs an "output" directory, relative to its repo root`)
  }

  const ref = raw.ref ?? defaults.ref ?? 'main'
  if (!REF_PATTERN.test(ref)) {
    throw new RegistryError(`"${id}" has an invalid ref ${JSON.stringify(ref)}`)
  }

  return {
    id,
    // Absent `enabled` means disabled. A project you forgot to flip on is a
    // missing docs section; one you forgot to flip off is a broken deploy.
    enabled: raw.enabled === true,
    repo: raw.repo ?? `rxova/${id}`,
    ref,
    install: raw.install ?? defaults.install ?? 'pnpm install --frozen-lockfile',
    build,
    output: raw.output,

    // Derived — see the header comment. Never write these in sources.json.
    base: `/packages/${id}/`,
    mount: `packages/${id}`,
    artifact: `docs-${id}`,
    workdir: id,

    // Landing-page copy. The landing reads this itself; kept here so a
    // structural check can see it, and so one entry describes one project.
    landing: raw.landing ?? {},
  }
}

/** Read and validate the registry. Throws `RegistryError` on anything malformed. */
export function loadRegistry(file = SOURCES_FILE) {
  let raw
  try {
    raw = JSON.parse(readFileSync(file, 'utf8'))
  } catch (err) {
    throw new RegistryError(`could not be read or parsed — ${err.message}`)
  }

  const defaults = raw.defaults ?? {}
  const sources = (raw.sources ?? []).map((s) => resolveSource(s, defaults))

  const seen = new Set()
  for (const s of sources) {
    if (seen.has(s.id)) throw new RegistryError(`duplicate id "${s.id}"`)
    seen.add(s.id)
  }

  return {
    landing: raw.landing ?? { artifact: 'landing', mount: '.' },
    sources,
  }
}

/** Only the projects that should actually be built and mounted right now. */
export function enabledSources(registry) {
  return registry.sources.filter((s) => s.enabled)
}
