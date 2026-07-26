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
// unknown or disabled project is rejected, a base that disagrees with the mount is
// rejected, a dist with no index.html is rejected — are covered by tests
// (scripts/ingest.test.mjs) instead of being YAML that only ever runs in CI.

import { appendFileSync, statSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { loadRegistry, REF_PATTERN } from './registry.mjs'

/** The payload shape this aggregator understands. Bump when the contract changes. */
export const SUPPORTED_SCHEMA = 1

/** Informational only, but a typo here usually means a misconfigured sender. */
export const KNOWN_FRAMEWORKS = ['astro', 'docusaurus', 'other']

/**
 * The fixed name every source repo uploads its dist under. One convention for all
 * senders means the aggregator asks for the same artifact name every time — see
 * docs/INPUTS-CONTRACT.md.
 */
export const DIST_ARTIFACT_NAME = 'docs-dist'

const SHA_PATTERN = /^[0-9a-f]{7,40}$/
const RUN_ID_PATTERN = /^[0-9]+$/

export class IngestError extends Error {}

/**
 * Gate 2a. Validate the dispatch against the registry and return everything the
 * workflow needs to fetch and persist. Pure — no env, no filesystem, no network —
 * so every rejection below is testable without a workflow run.
 */
export function validateDispatch(registry, payload) {
  if (payload == null || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new IngestError('client_payload must be an object')
  }

  if (payload.schema !== SUPPORTED_SCHEMA) {
    throw new IngestError(
      `unsupported schema ${JSON.stringify(payload.schema)} — this aggregator speaks schema ${SUPPORTED_SCHEMA}`,
    )
  }

  const id = payload.project
  if (typeof id !== 'string' || id.length === 0) {
    throw new IngestError('client_payload.project is required')
  }

  const source = registry.sources.find((s) => s.id === id)
  if (!source) {
    // Loud rather than silent: a typo'd project name must not look like a normal
    // ingest of docs that then land nowhere the site links to.
    const known = registry.sources.map((s) => s.id).join(', ') || '(none)'
    throw new IngestError(`unknown project "${id}" — sources.json knows: ${known}`)
  }
  if (!source.enabled) {
    throw new IngestError(
      `project "${id}" is disabled in sources.json; enable it there before it can publish docs`,
    )
  }

  const sha = payload.sha == null ? '' : String(payload.sha)
  if (!SHA_PATTERN.test(sha)) {
    throw new IngestError(`client_payload.sha ${JSON.stringify(payload.sha)} is not a commit sha`)
  }

  const ref = payload.ref == null ? '' : String(payload.ref)
  if (!REF_PATTERN.test(ref)) {
    throw new IngestError(
      `client_payload.ref ${JSON.stringify(payload.ref)} has unexpected characters`,
    )
  }

  const runId = payload.run_id == null ? '' : String(payload.run_id)
  if (!RUN_ID_PATTERN.test(runId)) {
    throw new IngestError(`client_payload.run_id ${JSON.stringify(payload.run_id)} is not a run id`)
  }

  // Compliance: the base the docs were built for must be the one we mount them at.
  // The aggregator only relocates the tree — it never rewrites asset paths — so a
  // mismatch here is a live page with every asset 404ing. `base` is optional in
  // the payload, but if present it must agree.
  if (payload.base !== undefined && payload.base !== source.base) {
    throw new IngestError(
      `project "${id}" says it built for base ${JSON.stringify(payload.base)}, but it mounts at ${source.base}`,
    )
  }

  if (payload.framework !== undefined && !KNOWN_FRAMEWORKS.includes(payload.framework)) {
    throw new IngestError(
      `unknown framework ${JSON.stringify(payload.framework)} — known: ${KNOWN_FRAMEWORKS.join(', ')}`,
    )
  }

  // Path uniqueness / confinement. Ids are unique in the registry and every path
  // is derived from the id, so this holds by construction — assert it anyway, so a
  // future change to the derivation that broke it fails here and not on the live
  // site, and so "the mount is unique and stays inside the tree" is stated where
  // the dist is about to be trusted.
  if (
    source.mount !== `packages/${id}` ||
    source.mount.startsWith('/') ||
    source.mount.split('/').includes('..')
  ) {
    throw new IngestError(`refusing mount ${JSON.stringify(source.mount)} for "${id}"`)
  }

  return {
    source,
    meta: {
      project: id,
      ref,
      sha,
      runId,
      framework: payload.framework ?? 'other',
    },
  }
}

/**
 * Gate 2b. Validate the directory the sender's artifact extracted to. This is the
 * point where an already-built tree is trusted, so the checks are deliberately
 * concrete: it must be a non-empty directory with an index.html at its root, the
 * same thing that would otherwise 404 silently once deployed.
 */
export function checkDist(dir) {
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
    const { entries } = checkDist(dir)
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
