// Ingest is where an already-built docs tree, sent from another repo, is first
// trusted. These tests pin the two gates that trust rests on: gate 2a, which
// accepts or rejects the dispatch metadata (unknown/disabled project, a base that
// disagrees with the mount, a ref or run id that is not what it claims), and gate
// 2b, which accepts or rejects the dist itself (missing, empty, or no index.html).
// They run in `pnpm test`, so a regression fails on the pull request rather than
// on the next ingest — which is the only other place this code ever runs.

import { describe, it } from 'vitest'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  validateDispatch,
  checkDist,
  IngestError,
  SUPPORTED_SCHEMA,
  DIST_ARTIFACT_NAME,
} from './ingest.mjs'

/** A registry stub with just the fields validateDispatch reads. */
const registry = {
  sources: [
    {
      id: 'journey',
      enabled: true,
      repo: 'rxova/journey',
      base: '/packages/journey/',
      mount: 'packages/journey',
      releaseTag: 'content-journey',
      releaseAsset: 'docs-journey.tgz',
    },
    { id: 'off', enabled: false, base: '/packages/off/', mount: 'packages/off' },
  ],
}

/** A minimal valid dispatch; individual tests override the field under test. */
const payload = (over = {}) => ({
  schema: SUPPORTED_SCHEMA,
  project: 'journey',
  ref: 'main',
  sha: 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678',
  run_id: '1234567890',
  ...over,
})

describe('validateDispatch — the happy path', () => {
  it('accepts a well-formed dispatch and derives fetch + persist targets', () => {
    const { source, meta } = validateDispatch(registry, payload({ base: '/packages/journey/' }))
    assert.equal(source.id, 'journey')
    assert.equal(meta.project, 'journey')
    assert.equal(meta.runId, '1234567890')
    assert.equal(source.repo, 'rxova/journey')
    assert.equal(source.releaseTag, 'content-journey')
    assert.equal(source.releaseAsset, 'docs-journey.tgz')
  })

  it('coerces a numeric run id and treats base as optional', () => {
    const { meta } = validateDispatch(registry, payload({ run_id: 42, base: undefined }))
    assert.equal(meta.runId, '42')
    assert.equal(meta.framework, 'other') // defaulted when the sender omits it
  })

  it('keeps the artifact name a single shared convention', () => {
    assert.equal(DIST_ARTIFACT_NAME, 'docs-dist')
  })
})

describe('validateDispatch — rejections', () => {
  const rejects = (over, re) =>
    assert.throws(
      () => validateDispatch(registry, payload(over)),
      (e) => e instanceof IngestError && re.test(e.message),
    )

  it('rejects a payload that is not an object', () => {
    assert.throws(() => validateDispatch(registry, null), /must be an object/)
    assert.throws(() => validateDispatch(registry, []), /must be an object/)
  })

  it('rejects an unsupported schema, so a sender on a newer contract fails loudly', () => {
    rejects({ schema: 2 }, /unsupported schema/)
    rejects({ schema: undefined }, /unsupported schema/)
  })

  it('rejects an unknown project rather than ingesting docs nothing links to', () => {
    rejects({ project: 'nope' }, /unknown project "nope"/)
    rejects({ project: '' }, /project is required/)
  })

  it('rejects a project that is disabled in sources.json', () => {
    rejects({ project: 'off' }, /disabled in sources\.json/)
  })

  it('rejects a base that disagrees with the mount — the classic 404-everything bug', () => {
    rejects({ base: '/packages/journeys/' }, /built for base/)
    rejects({ base: '/' }, /built for base/)
  })

  it('rejects a sha, ref or run id that is not what it claims to be', () => {
    rejects({ sha: 'not-a-sha' }, /is not a commit sha/)
    rejects({ sha: undefined }, /is not a commit sha/)
    rejects({ ref: 'main; rm -rf /' }, /unexpected characters/)
    rejects({ ref: '$(whoami)' }, /unexpected characters/)
    rejects({ run_id: 'abc' }, /is not a run id/)
    rejects({ run_id: undefined }, /is not a run id/)
  })

  it('rejects an unknown framework', () => {
    rejects({ framework: 'vitepress' }, /unknown framework/)
  })
})

describe('checkDist — gate 2b', () => {
  let dir
  const make = () => mkdtempSync(join(tmpdir(), 'rxova-dist-'))

  it('accepts a directory with an index.html at its root', () => {
    dir = make()
    writeFileSync(join(dir, 'index.html'), '<!doctype html>')
    mkdirSync(join(dir, 'assets'))
    writeFileSync(join(dir, 'assets', 'app.css'), 'body{}')
    assert.deepEqual(checkDist(dir), { entries: 2 })
    rmSync(dir, { recursive: true, force: true })
  })

  it('rejects a missing directory', () => {
    assert.throws(
      () => checkDist(join(tmpdir(), 'does-not-exist-xyz')),
      /missing or not a directory/,
    )
  })

  it('rejects an empty directory', () => {
    dir = make()
    assert.throws(() => checkDist(dir), /is empty/)
    rmSync(dir, { recursive: true, force: true })
  })

  it('rejects a build with no index.html at the root — the wrong base or wrong dir', () => {
    dir = make()
    writeFileSync(join(dir, 'sitemap.xml'), '<urlset/>')
    assert.throws(() => checkDist(dir), /no index\.html/)
    rmSync(dir, { recursive: true, force: true })
  })
})
