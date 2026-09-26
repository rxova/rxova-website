// The command line ingest.yml runs: which gate `argv` selects, what each prints,
// and the outputs the workflow reads. The gates' rules are pinned in ingest.test.ts.

import { afterEach, describe, it, vi } from 'vitest'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { runIngest, type DispatchSource, type IngestOptions } from './ingest.ts'
import { loadRegistry } from '../lib/registry.ts'

const journey: DispatchSource = {
  id: 'journey',
  kind: 'package',
  enabled: true,
  repo: 'rxova/journey',
  base: '/packages/journey/',
  mount: 'packages/journey',
  releaseTag: 'content-journey',
  releaseAsset: 'docs-journey.tgz',
}

const SHA = 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678'
const PAYLOAD = JSON.stringify({ project: 'journey', ref: 'main', sha: SHA, run_id: '42' })

const OUTPUTS = [
  'project=journey',
  'repo=rxova/journey',
  'run_id=42',
  'artifact_name=docs-dist',
  'release_tag=content-journey',
  'release_asset=docs-journey.tgz',
  `sha=${SHA}`,
  'ref=main',
  'framework=other',
  'base=/packages/journey/',
  'schema=1',
  'enabled=true',
]

const roots: string[] = []
afterEach(() => {
  for (const dir of roots.splice(0)) rmSync(dir, { recursive: true, force: true })
  vi.restoreAllMocks()
})

const tempDir = () => {
  const dir = mkdtempSync(join(tmpdir(), 'rxova-ingest-cli-'))
  roots.push(dir)
  return dir
}

/** Captured output, and a registry holding just `journey`. */
const io = () => {
  const out: string[] = []
  const err: string[] = []
  const options: IngestOptions = {
    load: () => ({ sources: [journey] }),
    log: (m) => out.push(m),
    error: (m) => err.push(m),
  }
  return { out, err, options }
}

describe('runIngest — gate 2a, the dispatch', () => {
  it('prints the accepted dispatch and its outputs when there is no $GITHUB_OUTPUT', () => {
    const { out, err, options } = io()

    assert.equal(runIngest([], { CLIENT_PAYLOAD: PAYLOAD }, options), 0)
    assert.deepEqual(out, [
      `✓ journey @ ${SHA} (ref main, other) -> /packages/journey/`,
      OUTPUTS.join('\n'),
    ])
    assert.deepEqual(err, [])
  })

  it('appends the outputs to $GITHUB_OUTPUT when the workflow sets it', () => {
    const { out, options } = io()
    const file = join(tempDir(), 'github-output')
    writeFileSync(file, 'earlier=1\n')

    assert.equal(runIngest([], { CLIENT_PAYLOAD: PAYLOAD, GITHUB_OUTPUT: file }, options), 0)
    assert.equal(readFileSync(file, 'utf8'), `earlier=1\n${OUTPUTS.join('\n')}\n`)
    assert.equal(out.length, 1)
  })

  it('reads a missing payload as an empty one, which the contract then refuses', () => {
    const { err, options } = io()

    assert.equal(runIngest([], {}, options), 1)
    assert.match(err[0] ?? '', /^ERROR: client_payload is invalid:/)
  })

  it('refuses a payload that is not JSON', () => {
    const { err, options } = io()

    assert.equal(runIngest([], { CLIENT_PAYLOAD: '{ nope' }, options), 1)
    assert.deepEqual(err, ['ERROR: CLIENT_PAYLOAD was not valid JSON'])
  })

  it('checks against the real sources.json and the real console by default', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { id, base } = loadRegistry().sources[0]!
    const payload = JSON.stringify({ project: id, ref: 'main', sha: SHA, run_id: '1', base })

    assert.equal(runIngest([], { CLIENT_PAYLOAD: payload }), 0)
    assert.match(String(log.mock.calls[0]?.[0]), new RegExp(`^✓ ${id} @ ${SHA}`))
  })
})

describe('runIngest — gate 2b, the dist', () => {
  it('counts the entries of an accepted dist', () => {
    const dist = tempDir()
    writeFileSync(join(dist, 'index.html'), '<!doctype html>')
    const { out, options } = io()

    assert.equal(runIngest(['--check-dist', dist], {}, options), 0)
    assert.deepEqual(out, ['✓ dist OK — 1 entry, index.html present'])

    writeFileSync(join(dist, 'robots.txt'), '')
    runIngest(['--check-dist', dist], {}, options)
    assert.equal(out[1], '✓ dist OK — 2 entries, index.html present')
  })

  it('holds the dist to what the dispatch declared', () => {
    const dist = tempDir()
    writeFileSync(join(dist, 'index.html'), '<main>Blog</main>')
    const { err, options } = io()
    const env = { EXPECTED_SCHEMA: '2', EXPECTED_PROJECT: 'blog', EXPECTED_BASE: '/blog/' }

    assert.equal(runIngest(['--check-dist', dist], env, options), 1)
    assert.deepEqual(err, ['ERROR: schema 2 dist has no rxova-page-bundle.json'])
  })

  it('prints the usage when the directory is missing', () => {
    const { err, options } = io()

    assert.equal(runIngest(['--check-dist'], {}, options), 1)
    assert.deepEqual(err, ['ERROR: usage: ingest.ts --check-dist <dir>'])
  })

  it('reports failures on the real console by default', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    assert.equal(runIngest(['--check-dist', join(tempDir(), 'missing')], {}), 1)
    assert.match(String(error.mock.calls[0]?.[0]), /^ERROR: dist ".*missing" is missing/)
  })
})
