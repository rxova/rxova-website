#!/usr/bin/env node
// Gate 2 of the docs pipeline: `node ingest.ts` validates $CLIENT_PAYLOAD and emits outputs (2a);
// `node ingest.ts --check-dist <dir>` validates the downloaded dist (2b).

import { appendFileSync, statSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  dispatchPayload,
  mountFor,
  PAGE_BUNDLE_FILENAME,
  pageBundleManifest,
} from '@rxova/website-schemas'

import { declaresStandalone } from '../lib/standalone.ts'

import { errorMessage } from '../lib/errors.ts'
import { loadRegistry, type Source } from '../lib/registry.ts'

/** The payload shape this aggregator understands. Bump when the contract changes. */
export const SUPPORTED_SCHEMA = 2

/** Informational only, but a typo here usually means a misconfigured sender. */
export const KNOWN_FRAMEWORKS = ['astro', 'docusaurus', 'storybook', 'other']

/** The fixed artifact name every source repo uploads its dist under (docs/INPUTS-CONTRACT.md). */
export const DIST_ARTIFACT_NAME = 'docs-dist'

export class IngestError extends Error {}

function htmlFiles(dir: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) found.push(...htmlFiles(path))
    else if (entry.isFile() && entry.name.endsWith('.html')) found.push(path)
  }
  return found
}

/**
 * Gate 2a: validates the dispatch against the registry and returns what the workflow
 * needs to fetch and persist. Pure — no env, filesystem or network.
 */
/** The part of a registry source a dispatch is checked against. */
export type DispatchSource = Pick<
  Source,
  'id' | 'kind' | 'enabled' | 'base' | 'mount' | 'repo' | 'releaseTag' | 'releaseAsset'
>

export function validateDispatch(registry: { sources: DispatchSource[] }, payload: unknown) {
  // Field shapes come from `@rxova/website-schemas`; below is what the schema cannot
  // know: whether the project is registered and whether its base matches the mount.
  const requestedSchema = (payload as { schema?: unknown } | null)?.schema ?? 1
  const parsed = dispatchPayload.safeParse(
    requestedSchema === 2 ? { ...(payload as object), schema: 1 } : payload,
  )
  if (!parsed.success) {
    throw new IngestError(
      'client_payload is invalid:\n' +
        parsed.error.issues
          .map((i) => `  ${i.path.length ? i.path.join('.') : '(payload)'} — ${i.message}`)
          .join('\n'),
    )
  }

  const { project: id, sha, ref } = parsed.data
  const schema = requestedSchema
  const runId = String(parsed.data.run_id)

  const source = registry.sources.find((s) => s.id === id)
  if (!source) {
    // Loud rather than silent: a typo'd project name must not look like a normal
    // ingest of docs that then land nowhere the site links to.
    const known = registry.sources.map((s) => s.id).join(', ') || '(none)'
    throw new IngestError(`unknown project "${id}" — sources.json knows: ${known}`)
  }
  // A *disabled* project is accepted and persisted, just not deployed: `fetch-docs.ts`
  // fetches only enabled sources, so its release is ready when the flag flips.

  // An optional `base` must equal the mount: the tree is relocated, never rewritten,
  // so a mismatch 404s every asset.
  if (parsed.data.base !== undefined && parsed.data.base !== source.base) {
    throw new IngestError(
      `project "${id}" says it built for base ${JSON.stringify(parsed.data.base)}, but it mounts at ${source.base}`,
    )
  }

  if (parsed.data.framework !== undefined && !KNOWN_FRAMEWORKS.includes(parsed.data.framework)) {
    throw new IngestError(
      `unknown framework ${JSON.stringify(parsed.data.framework)} — known: ${KNOWN_FRAMEWORKS.join(', ')}`,
    )
  }

  // Holds by construction, asserted anyway: the mount must equal the shared `mountFor`
  // and stay inside the tree, so a derivation change fails here, not on the live site.
  if (
    source.mount !== mountFor(id, source.kind) ||
    source.mount.startsWith('/') ||
    source.mount.split('/').includes('..')
  ) {
    throw new IngestError(
      `refusing mount ${JSON.stringify(source.mount)} for "${id}" (kind ${source.kind})`,
    )
  }

  return {
    source,
    meta: {
      project: id,
      ref,
      sha,
      runId,
      framework: (payload as { framework?: string }).framework ?? 'other',
      // The workflow gates the deploy on this: there is nothing to publish for a
      // project the assembler will not mount.
      enabled: source.enabled,
      schema,
    },
  }
}

/**
 * Gate 2b: the sender's extracted dist must be a non-empty directory with an
 * index.html at its root.
 */
/** What the dispatch said the dist is, checked against its page-bundle manifest. */
export interface ExpectedDist {
  schema?: number
  project?: string
  base?: string
}

export function checkDist(dir: string, expected: ExpectedDist = {}): { entries: number } {
  let entries: string[]
  try {
    if (!statSync(dir).isDirectory()) throw new Error('not a directory')
    entries = readdirSync(dir)
  } catch {
    throw new IngestError(`dist ${JSON.stringify(dir)} is missing or not a directory`)
  }
  if (entries.length === 0) {
    throw new IngestError(`dist ${JSON.stringify(dir)} is empty — nothing was uploaded`)
  }
  let hasIndex: boolean
  try {
    hasIndex = statSync(join(dir, 'index.html')).isFile()
  } catch {
    hasIndex = false
  }
  if (!hasIndex) {
    throw new IngestError(
      `dist ${JSON.stringify(dir)} has no index.html at its root — the docs were built for the wrong base, or the wrong directory was uploaded`,
    )
  }

  const manifestPath = join(dir, PAGE_BUNDLE_FILENAME)
  const hasManifest = entries.includes(PAGE_BUNDLE_FILENAME)
  if (expected.schema === 2 && !hasManifest) {
    throw new IngestError(`schema 2 dist has no ${PAGE_BUNDLE_FILENAME}`)
  }
  if (hasManifest) {
    let raw: unknown
    try {
      raw = JSON.parse(readFileSync(manifestPath, 'utf8'))
    } catch {
      throw new IngestError(`${PAGE_BUNDLE_FILENAME} is not valid JSON`)
    }
    const parsed = pageBundleManifest.safeParse(raw)
    if (!parsed.success) throw new IngestError(`${PAGE_BUNDLE_FILENAME} is invalid`)
    if (expected.project && parsed.data.project !== expected.project) {
      throw new IngestError(
        `${PAGE_BUNDLE_FILENAME} project is ${parsed.data.project}, expected ${expected.project}`,
      )
    }
    if (expected.base && parsed.data.base !== expected.base) {
      throw new IngestError(
        `${PAGE_BUNDLE_FILENAME} base is ${parsed.data.base}, expected ${expected.base}`,
      )
    }
    for (const path of htmlFiles(dir)) {
      const html = readFileSync(path, 'utf8')
      // A standalone asset is published verbatim, so the page rules below skip it.
      if (declaresStandalone(html)) continue
      const redirect = /<meta[^>]+http-equiv=["']refresh["']/i.test(html)
      if (!/<main(?:\s|>)/i.test(html) && !redirect) {
        throw new IngestError(`schema 2 ${path} has no <main> page component`)
      }
      if (/static\.cloudflareinsights\.com\/beacon\.min\.js/i.test(html)) {
        throw new IngestError('schema 2 page component includes Cloudflare Analytics')
      }
      if (/class=["'][^"']*\brx-footer\b/i.test(html)) {
        throw new IngestError('schema 2 page component includes the global Rxova footer')
      }
    }
  }
  return { entries: entries.length }
}

/** Where the CLI reads the registry and writes its lines; the defaults are the real ones. */
export interface IngestOptions {
  load?: () => { sources: DispatchSource[] }
  log?: (message: string) => void
  error?: (message: string) => void
}

/** Workflow outputs go to $GITHUB_OUTPUT when set, else to the log. */
function emit(lines: string[], env: NodeJS.ProcessEnv, log: (message: string) => void): void {
  const text = lines.join('\n') + '\n'
  if (!env.GITHUB_OUTPUT) {
    log(text.trimEnd())
    return
  }
  appendFileSync(env.GITHUB_OUTPUT, text)
}

function main(
  argv: string[],
  env: NodeJS.ProcessEnv,
  { load = loadRegistry, log = console.log }: IngestOptions,
): void {
  const distFlag = argv.indexOf('--check-dist')
  if (distFlag !== -1) {
    const dir = argv[distFlag + 1]
    if (!dir) throw new IngestError('usage: ingest.ts --check-dist <dir>')
    const schema = env.EXPECTED_SCHEMA ? Number(env.EXPECTED_SCHEMA) : undefined
    const { entries } = checkDist(dir, {
      schema,
      project: env.EXPECTED_PROJECT,
      base: env.EXPECTED_BASE,
    })
    log(`✓ dist OK — ${entries} entr${entries === 1 ? 'y' : 'ies'}, index.html present`)
    return
  }

  let payload
  try {
    payload = JSON.parse(env.CLIENT_PAYLOAD || '{}')
  } catch {
    throw new IngestError('CLIENT_PAYLOAD was not valid JSON')
  }

  const registry = load()
  const { source, meta } = validateDispatch(registry, payload)

  log(`✓ ${meta.project} @ ${meta.sha} (ref ${meta.ref}, ${meta.framework}) -> ${source.base}`)

  emit(
    [
      `project=${meta.project}`,
      `repo=${source.repo}`,
      `run_id=${meta.runId}`,
      `artifact_name=${DIST_ARTIFACT_NAME}`,
      `release_tag=${source.releaseTag}`,
      `release_asset=${source.releaseAsset}`,
      `sha=${meta.sha}`,
      `ref=${meta.ref}`,
      `framework=${meta.framework}`,
      `base=${source.base}`,
      `schema=${meta.schema}`,
      // The workflow reads this to decide whether to deploy. A disabled project is
      // still persisted — see validateDispatch — it just changes nothing live.
      `enabled=${meta.enabled}`,
    ],
    env,
    log,
  )
}

/** The CLI: either gate, by `argv`; returns the exit code, printing any failure. */
export function runIngest(
  argv: string[],
  env: NodeJS.ProcessEnv = process.env,
  options: IngestOptions = {},
): number {
  const { error = console.error } = options
  try {
    main(argv, env, options)
    return 0
  } catch (err) {
    error(`ERROR: ${errorMessage(err)}`)
    return 1
  }
}

/* v8 ignore start -- entry point; the ingest workflow is what runs it */
if (import.meta.main) process.exitCode = runIngest(process.argv.slice(2))
/* v8 ignore stop */
