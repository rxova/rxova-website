#!/usr/bin/env node
// Gate 2 of the docs pipeline: validate what a source repo sent, then hand the
// workflow what it needs to persist that project's docs. Nothing here builds or
// trusts foreign code — it checks metadata and a directory of static files.
//
// A source repo builds its own docs and uploads them (gate 1 — see
// docs/INPUTS-CONTRACT.md), then fires a `repository_dispatch` naming the run
// that holds them. This script is the receiver's half of that contract:
//
//   node scripts/ingest.mjs                     # gate 2a: validate $CLIENT_PAYLOAD, emit outputs
//   node scripts/ingest.mjs --check-dist <dir>  # gate 2b: validate the downloaded dist
//
// The two halves match the two things .github/workflows/ingest.yml does: decide
// whether to accept the dispatch (and where to fetch/persist), then, once the dist
// is downloaded, decide whether it is a publishable docs tree.
//
// It lives in a script rather than inline in the workflow so the rules — an
// unknown project is rejected, a base that disagrees with the mount is
// rejected, a dist with no index.html is rejected — are covered by tests
// (scripts/ingest.test.mjs) instead of being YAML that only ever runs in CI.

import { appendFileSync, statSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { dispatchPayload, mountFor } from '@rxova/website-schemas'

import { PAGE_BUNDLE_FILENAME, pageBundleManifest } from './page-bundle-contract.mjs'

import { loadRegistry } from './registry.mjs'

/** The payload shape this aggregator understands. Bump when the contract changes. */
export const SUPPORTED_SCHEMA = 2

/** Informational only, but a typo here usually means a misconfigured sender. */
export const KNOWN_FRAMEWORKS = ['astro', 'docusaurus', 'other']

/**
 * The fixed name every source repo uploads its dist under. One convention for all
 * senders means the aggregator asks for the same artifact name every time — see
 * docs/INPUTS-CONTRACT.md.
 */
export const DIST_ARTIFACT_NAME = 'docs-dist'

export class IngestError extends Error {}

function htmlFiles(dir) {
  const found = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) found.push(...htmlFiles(path))
    else if (entry.isFile() && entry.name.endsWith('.html')) found.push(path)
  }
  return found
}

/**
 * Gate 2a. Validate the dispatch against the registry and return everything the
 * workflow needs to fetch and persist. Pure — no env, no filesystem, no network —
 * so every rejection below is testable without a workflow run.
 */
export function validateDispatch(registry, payload) {
  // Field shapes come from `@rxova/website-schemas`, the contract the senders are
  // written against — so `run_id` being digits, `ref` being a ref, `sha` being hex
  // and `version` being semver are stated once, in the package both sides import,
  // rather than as regexes here that can drift from what brand actually sends.
  //
  // What stays below is everything the schema cannot know: whether this repo has
  // heard of the project, whether it is enabled, and whether the base the sender
  // built for is the base we will mount it at.
  const requestedSchema = payload?.schema ?? 1
  const parsed = dispatchPayload.safeParse(
    requestedSchema === 2 ? { ...payload, schema: 1 } : payload,
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
  // A *disabled* project is accepted and persisted; it simply is not deployed.
  //
  // Rejecting it conflated two different things. An unknown project is a typo and
  // must fail loudly. A known-but-disabled one is a deliberate registry state, and
  // refusing its docs created a deadlock: the aggregator would not store them until
  // the project was enabled, and enabling it made `fetch-docs.mjs` demand a release
  // that could not exist yet — so turning a project on always cost one red deploy.
  //
  // Persisting regardless costs a release asset and nothing else: `fetch-docs.mjs`
  // only ever fetches enabled sources, so the tree sits there unread until the flag
  // flips, at which point the first deploy already has everything it needs.

  // Compliance: the base the docs were built for must be the one we mount them at.
  // The aggregator only relocates the tree — it never rewrites asset paths — so a
  // mismatch here is a live page with every asset 404ing. `base` is optional in
  // the payload, but if present it must agree.
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

  // Path uniqueness / confinement. Ids are unique in the registry and every path
  // is derived from the id, so this holds by construction — assert it anyway, so a
  // future change to the derivation that broke it fails here and not on the live
  // site, and so "the mount is unique and stays inside the tree" is stated where
  // the dist is about to be trusted.
  //
  // Checked against `mountFor` from the shared package rather than a literal
  // `packages/${id}`, which predated `kind: "site"` and refused every /blog and
  // /updates ingest outright. Recomputing it here is the point: if the registry ever
  // derived a mount some other way, this is where the disagreement surfaces.
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
      framework: payload.framework ?? 'other',
      // The workflow gates the deploy on this: there is nothing to publish for a
      // project the assembler will not mount.
      enabled: source.enabled,
      schema,
    },
  }
}

/**
 * Gate 2b. Validate the directory the sender's artifact extracted to. This is the
 * point where an already-built tree is trusted, so the checks are deliberately
 * concrete: it must be a non-empty directory with an index.html at its root, the
 * same thing that would otherwise 404 silently once deployed.
 */
export function checkDist(dir, expected = {}) {
  let entries
  try {
    if (!statSync(dir).isDirectory()) throw new Error('not a directory')
    entries = readdirSync(dir)
  } catch {
    throw new IngestError(`dist ${JSON.stringify(dir)} is missing or not a directory`)
  }
  if (entries.length === 0) {
    throw new IngestError(`dist ${JSON.stringify(dir)} is empty — nothing was uploaded`)
  }
  let hasIndex
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
    let raw
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

function emit(lines) {
  const text = lines.join('\n') + '\n'
  if (!process.env.GITHUB_OUTPUT) {
    console.log(text.trimEnd())
    return
  }
  appendFileSync(process.env.GITHUB_OUTPUT, text)
}

function main(argv, env) {
  const distFlag = argv.indexOf('--check-dist')
  if (distFlag !== -1) {
    const dir = argv[distFlag + 1]
    if (!dir) throw new IngestError('usage: ingest.mjs --check-dist <dir>')
    const schema = env.EXPECTED_SCHEMA ? Number(env.EXPECTED_SCHEMA) : undefined
    const { entries } = checkDist(dir, {
      schema,
      project: env.EXPECTED_PROJECT,
      base: env.EXPECTED_BASE,
    })
    console.log(`✓ dist OK — ${entries} entr${entries === 1 ? 'y' : 'ies'}, index.html present`)
    return
  }

  let payload
  try {
    payload = JSON.parse(env.CLIENT_PAYLOAD || '{}')
  } catch {
    throw new IngestError('CLIENT_PAYLOAD was not valid JSON')
  }

  const registry = loadRegistry()
  const { source, meta } = validateDispatch(registry, payload)

  console.log(
    `✓ ${meta.project} @ ${meta.sha} (ref ${meta.ref}, ${meta.framework}) -> ${source.base}`,
  )

  emit([
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
  ])
}

// Only run as a CLI; the tests import the functions above.
if (import.meta.filename === process.argv[1]) {
  try {
    main(process.argv.slice(2), process.env)
  } catch (err) {
    console.error(`ERROR: ${err.message}`)
    process.exit(1)
  }
}
