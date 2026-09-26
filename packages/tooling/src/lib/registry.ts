// The project registry: the one reader of `sources.json` for the deploy scripts. It fills
// defaults, derives base/mount/artifact/release paths from `id`, and rejects malformed entries.

import { readFileSync } from 'node:fs'

import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../..')

export const SOURCES_FILE = join(repoRoot, 'sources.json')

/** Shape and path derivation are shared with the senders, so both compute mounts identically. */
import { sourceEntry, mountFor, baseFor } from '@rxova/website-schemas'

import { errorMessage } from './errors.ts'

/** Allowed characters of an untrusted git ref from a `repository_dispatch` payload. */
export const REF_PATTERN = /^[A-Za-z0-9._/-]+$/

class RegistryError extends Error {
  constructor(message: string) {
    super(`sources.json: ${message}`)
    this.name = 'RegistryError'
  }
}

/** Resolves one raw entry into its full form: validated, with every path derived. */
export function resolveSource(raw: unknown) {
  // The schema owns shape, defaults and cross-field rules; it is `.strict()`, so a typo'd
  // key (e.g. `enable`) is refused rather than ignored.
  const parsed = sourceEntry.safeParse(raw)
  if (!parsed.success) {
    const rawId = (raw as { id?: unknown } | null)?.id
    const id = typeof rawId === 'string' ? rawId : JSON.stringify(rawId)
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

export type Source = ReturnType<typeof resolveSource>

export interface Registry {
  landing: { artifact: string; mount: string }
  sources: Source[]
  /** Set by the assembler and tests; the file carries neither. */
  origin?: string
  redirects?: Record<string, string>
}

/** Read and validate the registry. Throws `RegistryError` on anything malformed. */
export function loadRegistry(file = SOURCES_FILE): Registry {
  let raw: { landing?: Registry['landing']; sources?: unknown[] }
  try {
    raw = JSON.parse(readFileSync(file, 'utf8')) as typeof raw
  } catch (err) {
    throw new RegistryError(`could not be read or parsed — ${errorMessage(err)}`)
  }

  const sources = (raw.sources ?? []).map((s) => resolveSource(s))

  const seen = new Set<string>()
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
export function enabledSources<S extends Pick<Source, 'enabled'>>(registry: { sources: S[] }): S[] {
  return registry.sources.filter((s) => s.enabled)
}
