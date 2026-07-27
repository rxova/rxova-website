// The project registry: one place that reads `sources.json`, fills in defaults,
// derives the paths, and refuses to return anything malformed.
//
// Everything that needs to know "what projects make up rxova.org" goes through
// here — `assemble.mjs` (which copies artifacts into the final tree), `ingest.mjs`
// (which validates and persists a project's freshly-built docs) and
// `fetch-docs.mjs` (which pulls those persisted docs back at deploy time). None
// of them re-reads the JSON itself, so there is no second place for the shape of
// an entry to be understood slightly differently.
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
//   id: "journey"  ->  base:    /packages/journey/   (URL the docs are built for)
//                      mount:   packages/journey     (path in the deployed tree)
//                      artifact:docs-journey         (where a build lands under artifacts/)
//                      release: content-journey      (tag of its persisted-docs release)
//                               docs-journey.tgz     (the asset in that release)
//
// These used to be written out per project, which meant several chances to typo a
// mount that silently disagrees with the base URL the docs were built with — a
// class of bug whose symptom is a live page with every stylesheet 404ing.
// Deriving them makes that disagreement unrepresentable.
//
// ## The aggregator no longer builds anything
//
// Docs are built by their own repos and sent here already built (see
// docs/INPUTS-CONTRACT.md and .github/workflows/ingest.yml). So a source entry
// carries no `build`, `install` or `output`: this repo never checks a project out
// and never runs its toolchain. It only ever moves already-built trees around.

import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

export const SOURCES_FILE = join(repoRoot, 'sources.json')

/** Project ids are used in URLs, artifact names and shell paths — keep them boring. */
const ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/

/**
 * What a source is, which decides where it mounts.
 *
 * `package` — a project's docs, at `/packages/<id>/`. The default, and what every
 * entry was before this existed.
 * `site`    — a standalone surface of rxova.org, at `/<id>/`. Used by `blog` and
 * `updates`, which are built in the brand monorepo and shipped here like any other
 * dist, but are not packages and have no npm or docs of their own.
 *
 * Note this is still a *derivation*, not an override: a source says what it is and
 * the paths follow. `sources.json` never writes a mount, so a mount cannot disagree
 * with the base URL its tree was built against — the property that made these
 * derived in the first place.
 */
const KINDS = ['package', 'site']

/**
 * Git refs reach us from a `repository_dispatch` payload, i.e. from outside this
 * repo. They end up in release notes and log lines, so constrain them to what a
 * branch name or SHA can actually contain rather than trusting the sender.
 * Exported for ingest.mjs, which validates the ref a source repo sends.
 */
export const REF_PATTERN = /^[A-Za-z0-9._/-]+$/

class RegistryError extends Error {
  constructor(message) {
    super(`sources.json: ${message}`)
    this.name = 'RegistryError'
  }
}

/**
 * Resolve one raw entry into its full form: paths derived, nothing trusted.
 * Exported for tests and for anything that wants the derivation without the file.
 */
export function resolveSource(raw) {
  const id = raw?.id
  if (typeof id !== 'string' || !ID_PATTERN.test(id)) {
    throw new RegistryError(
      `every source needs an "id" of lowercase letters, digits and dashes; got ${JSON.stringify(id)}`,
    )
  }

  // Absent means `package`, so every entry written before kinds existed keeps its
  // meaning. An unknown kind is refused rather than silently treated as a package,
  // which would mount a surface at a path nothing links to.
  const kind = raw.kind ?? 'package'
  if (!KINDS.includes(kind)) {
    throw new RegistryError(
      `"${id}" has kind ${JSON.stringify(kind)}; expected one of ${KINDS.join(', ')}`,
    )
  }

  return {
    id,
    // Absent `enabled` means disabled. A project you forgot to flip on is a
    // missing docs section; one you forgot to flip off is a broken deploy.
    enabled: raw.enabled === true,
    // Where this project's docs are built and ingested from. Derived, but
    // overridable for the odd project that does not live at rxova/<id>.
    repo: raw.repo ?? `rxova/${id}`,

    kind,

    // Derived from `id` and `kind` — see the header comment. Never write these in
    // sources.json.
    base: kind === 'site' ? `/${id}/` : `/packages/${id}/`,
    mount: kind === 'site' ? id : `packages/${id}`,
    artifact: `docs-${id}`,
    releaseTag: `content-${id}`,
    releaseAsset: `docs-${id}.tgz`,

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

  const sources = (raw.sources ?? []).map((s) => resolveSource(s))

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
