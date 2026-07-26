#!/usr/bin/env node
// Work out which directory a project's docs build actually produced.
//
// Usage: node scripts/resolve-output.mjs <project-id> [workdir=<project-id>]
//
// Docs frameworks disagree about where a build lands: Docusaurus emits `build/`,
// Astro/Starlight emits `dist/`. `sources.json` therefore lists candidates in
// preference order (Astro first — it is the house default now) instead of
// pinning one path, and this script picks the first that the build actually
// filled in. A project can migrate between frameworks with no change here and
// none in deploy.yml.
//
// It lives in a script rather than inline in the workflow for two reasons: the
// candidate list stays readable from sources.json instead of being marshalled
// through a matrix field as a newline-joined string, and the resolution is
// covered by tests (scripts/resolve-output.test.mjs) rather than being shell
// that only ever runs in CI.
//
// Writes `dir=<path>` to $GITHUB_OUTPUT when set, relative to the workspace
// root, ready to hand to upload-artifact. Exits 1 with a diagnosis when nothing
// was produced — upload-artifact's own message ("No files were found with the
// provided path") names a path without saying which knob controls it.

import { appendFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { loadRegistry } from './registry.mjs'

/** A candidate counts only if it is a directory with something in it. */
function isNonEmptyDir(path) {
  try {
    return statSync(path).isDirectory() && readdirSync(path).length > 0
  } catch {
    return false
  }
}

/**
 * Pick the first candidate that exists under `workdir` and is non-empty.
 *
 * Returns `{ dir, checked, hasIndex }` where `dir` is joined onto `workdir` (so
 * it is usable straight from the workspace root) and `checked` lists the
 * candidates rejected before it, for the failure message.
 */
export function resolveOutput(candidates, workdir) {
  const checked = []
  for (const candidate of candidates) {
    const dir = join(workdir, candidate)
    if (isNonEmptyDir(dir)) return { dir, candidate, checked, hasIndex: hasIndex(dir) }
    checked.push(candidate)
  }
  return { dir: null, candidate: null, checked, hasIndex: false }
}

function hasIndex(dir) {
  try {
    return statSync(join(dir, 'index.html')).isFile()
  } catch {
    return false
  }
}

/** Everything the CLI needs about one project, resolved against the registry. */
export function outputFor(projectId, workdir, registry) {
  const source = registry.sources.find((s) => s.id === projectId)
  if (!source) {
    const known = registry.sources.map((s) => s.id).join(', ') || '(none)'
    throw new Error(`unknown project "${projectId}" — sources.json knows: ${known}`)
  }
  return { source, ...resolveOutput(source.output, workdir) }
}

function main(argv, env) {
  const [projectId, workdirArg] = argv
  if (!projectId) throw new Error('usage: resolve-output.mjs <project-id> [workdir]')

  const registry = loadRegistry()
  const workdir = workdirArg || projectId
  const { source, dir, checked, hasIndex: indexed } = outputFor(projectId, workdir, registry)

  if (!dir) {
    console.error(`::error::No docs output for "${projectId}". Tried: ${checked.join(', ')}`)
    console.error('')
    console.error(`What is actually under ${workdir}:`)
    for (const entry of listShallow(workdir)) console.error(`  ${entry}`)
    console.error('')
    console.error('The docs build produced nothing to upload. Either it failed silently, or it')
    console.error('now emits somewhere else — in which case add "output" to this project\'s entry')
    console.error('in sources.json (a string, or a list of candidates tried in order).')
    process.exit(1)
  }

  console.log(`✓ ${projectId} docs output: ${dir}`)
  if (!indexed) {
    // Not fatal: a docs site could in principle land its entry point elsewhere.
    // But the usual cause is a build that ran with the wrong base URL, and the
    // symptom is a 404 on a page that deployed "successfully".
    console.log(`::warning::${dir} has no index.html at its root — ${source.base} may 404.`)
  }

  if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT, `dir=${dir}\n`)
}

/** One level of `workdir` plus its `apps/docs`, which is where docs normally land. */
function listShallow(workdir) {
  const lines = []
  for (const sub of ['.', 'apps/docs']) {
    const path = join(workdir, sub)
    try {
      const entries = readdirSync(path, { withFileTypes: true })
        .map((e) => (e.isDirectory() ? `${e.name}/` : e.name))
        .sort()
      lines.push(`${sub === '.' ? '' : sub + '/'} ${entries.join(' ') || '(empty)'}`.trim())
    } catch {
      lines.push(`${sub}: (absent)`)
    }
  }
  return lines
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
