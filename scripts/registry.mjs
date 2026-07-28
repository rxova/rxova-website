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

/**
 * The entry shape comes from `@rxova/website-schemas`, published from rxova/brand.
 *
 * It lives there rather than here because brand is the *sender*: `@rxova/blog` and
 * `@rxova/updates` are two of the entries this file governs, and a contract belongs
 * with the thing that has to keep it. Importing it means a rule cannot be enforced
 * one way here and another way there.
 *
 * `mountFor` and `baseFor` come from the same place for the same reason. The
 * derivation is the invariant worth protecting: a tree built for one base and
 * copied to a different mount serves a page with every stylesheet 404ing, and that
 * is only impossible if both repos compute it identically.
 */
import { sourceEntry, mountFor, baseFor } from '@rxova/website-schemas'

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
  // The schema owns the shape, the defaults and the cross-field rules — an unknown
  // kind, a site claiming a reserved top-level path, a package with no landing copy,
  // and any key nobody modelled. It is `.strict()`, so a typo'd field is refused
  // rather than silently ignored, which is how `enabled` would end up read as
  // `enable` and a project quietly stop deploying.
  const parsed = sourceEntry.safeParse(raw)
  if (!parsed.success) {
    const id = typeof raw?.id === 'string' ? raw.id : JSON.stringify(raw?.id)
    throw new RegistryError(
      `${id} is invalid:\n` +
        parsed.error.issues
          .map((i) => `  ${i.path.length ? i.path.join('.') : '(entry)'} — ${i.message}`)
          .join('\n'),
    )
  }

  const { id, kind, enabled } = parsed.data

  return {
    id,
    enabled,
    // Where this project's docs are built and ingested from. Derived, but
    // overridable for the odd project that does not live at rxova/<id>.
    repo: parsed.data.repo ?? `rxova/${id}`,

    kind,

    // Derived from `id` and `kind` by the shared package — never written in
    // sources.json, so a mount cannot disagree with the base its tree was built for.
    base: baseFor(id, kind),
    mount: mountFor(id, kind),
    artifact: `docs-${id}`,
    releaseTag: `content-${id}`,
    releaseAsset: `docs-${id}.tgz`,

    // Landing-page copy. The landing reads this itself; kept here so a
    // structural check can see it, and so one entry describes one project.
    landing: parsed.data.landing ?? {},
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
