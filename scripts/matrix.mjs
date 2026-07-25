#!/usr/bin/env node
// Generate the deploy workflow's docs-build matrix from sources.json.
//
// Usage: node scripts/matrix.mjs            # writes matrix= and count= to $GITHUB_OUTPUT
//        node scripts/matrix.mjs --print    # prints the matrix, for local inspection
//
// This exists so that adding a project is a config change rather than another
// copy of a thirty-line build job. The three jobs it replaced differed in six
// values and were otherwise identical, which is exactly the shape that rots:
// a fix applied to one and forgotten in the other two.
//
// ## Why every enabled project builds on every run
//
// A dispatch from one project does not mean "rebuild only that project".
// GitHub Pages deploys a whole tree, so assemble needs an artifact for every
// mounted project or that project's docs vanish from the site. The dispatching
// project's ref is honoured; everyone else builds their default ref.
//
// Env in:
//   EVENT_ACTION     github.event.action        (repository_dispatch type)
//   CLIENT_PAYLOAD   github.event.client_payload as JSON
//   INPUT_PROJECT    workflow_dispatch input, optional
//   INPUT_REF        workflow_dispatch input, optional

import { appendFileSync } from 'node:fs'
import { loadRegistry, enabledSources } from './registry.mjs'

const REF_PATTERN = /^[A-Za-z0-9._/-]+$/

/**
 * Work out which project (if any) asked for a specific ref.
 *
 * Two dispatch shapes are accepted. The current one is a single `docs` type
 * carrying `{project, ref}`, which is what lets deploy.yml's `on:` block stay
 * frozen as projects are added — `on.repository_dispatch.types` cannot contain
 * an expression, so a per-project type would mean editing the workflow forever.
 * The legacy `docs-<id>` types are still honoured so the sibling repos can
 * migrate one at a time instead of in a flag day.
 */
function resolveOverride(env) {
  const inputProject = env.INPUT_PROJECT?.trim()
  if (inputProject) return { project: inputProject, ref: env.INPUT_REF?.trim() || null }

  const action = env.EVENT_ACTION?.trim()
  if (!action) return { project: null, ref: null }

  let payload
  try {
    payload = JSON.parse(env.CLIENT_PAYLOAD || '{}') ?? {}
  } catch {
    throw new Error('client_payload was not valid JSON')
  }

  if (action === 'docs') {
    if (!payload.project) {
      throw new Error("a 'docs' dispatch must carry client_payload.project")
    }
    return { project: String(payload.project), ref: payload.ref ? String(payload.ref) : null }
  }

  if (action.startsWith('docs-')) {
    return { project: action.slice('docs-'.length), ref: payload.ref ? String(payload.ref) : null }
  }

  return { project: null, ref: null }
}

function main() {
  const registry = loadRegistry()
  const enabled = enabledSources(registry)
  const { project, ref } = resolveOverride(process.env)

  if (project) {
    const known = registry.sources.some((s) => s.id === project)
    if (!known) {
      // Loud rather than silent: a typo'd project name would otherwise look
      // like a perfectly normal build of everyone's default ref, and the newly
      // published docs the dispatch was announcing would quietly not be there.
      throw new Error(
        `unknown project "${project}" — known ids: ${registry.sources.map((s) => s.id).join(', ') || '(none)'}`,
      )
    }
    if (!enabled.some((s) => s.id === project)) {
      throw new Error(
        `project "${project}" dispatched a docs build but is disabled in sources.json`,
      )
    }
    if (ref && !REF_PATTERN.test(ref)) {
      throw new Error(`refusing ref ${JSON.stringify(ref)} for "${project}": unexpected characters`)
    }
  }

  const include = enabled.map((s) => ({
    id: s.id,
    repo: s.repo,
    ref: project === s.id && ref ? ref : s.ref,
    workdir: s.workdir,
    install: s.install,
    // One `run:` block per project; the workflow interpolates this verbatim.
    build: s.build.join('\n'),
    // Newline-separated candidates; the workflow picks the first that exists.
    output: s.output.join('\n'),
    base: s.base,
    artifact: s.artifact,
  }))

  const matrix = JSON.stringify({ include })

  for (const line of include) {
    console.log(`  • ${line.id.padEnd(16)} ${line.repo}@${line.ref} -> ${line.base}`)
  }
  const skipped = registry.sources.filter((s) => !s.enabled)
  for (const s of skipped) {
    console.log(`  – ${s.id.padEnd(16)} disabled in sources.json, not built`)
  }

  if (process.argv.includes('--print') || !process.env.GITHUB_OUTPUT) {
    console.log(matrix)
    return
  }

  appendFileSync(process.env.GITHUB_OUTPUT, `matrix=${matrix}\ncount=${include.length}\n`)
}

try {
  main()
} catch (err) {
  console.error(`ERROR: ${err.message}`)
  process.exit(1)
}
