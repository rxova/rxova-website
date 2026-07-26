// The registry is the single source of truth for what rxova.org is made of, and
// everything downstream — the ingest gate, the deploy-time fetch, the assembler —
// trusts whatever it returns. These tests pin the two things that trust rests on:
// the derivation (id -> base/mount/artifact/release, which must agree with itself
// or the site 404s) and the validation (what it refuses, so a bad entry fails in
// `pnpm test` and `pnpm check:registry` rather than mid-deploy).

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { resolveSource, loadRegistry, enabledSources, SOURCES_FILE } from './registry.mjs'

/** Minimum viable entry; individual tests override the field under test. */
const entry = (over = {}) => ({ id: 'foo', enabled: true, ...over })

function writeRegistry(contents) {
  const dir = mkdtempSync(join(tmpdir(), 'rxova-registry-'))
  const file = join(dir, 'sources.json')
  writeFileSync(file, typeof contents === 'string' ? contents : JSON.stringify(contents))
  return file
}

describe('resolveSource — derivation', () => {
  it('derives every path from the id', () => {
    const s = resolveSource(entry({ id: 'use-everywhere' }))
    assert.equal(s.base, '/packages/use-everywhere/')
    assert.equal(s.mount, 'packages/use-everywhere')
    assert.equal(s.artifact, 'docs-use-everywhere')
    assert.equal(s.releaseTag, 'content-use-everywhere')
    assert.equal(s.releaseAsset, 'docs-use-everywhere.tgz')
  })

  it('keeps mount and base in agreement — a mismatch is what 404s the site', () => {
    for (const id of ['journey', 'react-inputs', 'a', 'x9-y']) {
      const s = resolveSource(entry({ id }))
      assert.equal(s.base, `/${s.mount}/`)
    }
  })

  it('keeps the release tag and asset in agreement with the id', () => {
    for (const id of ['journey', 'react-inputs', 'a', 'x9-y']) {
      const s = resolveSource(entry({ id }))
      assert.equal(s.releaseTag, `content-${id}`)
      assert.equal(s.releaseAsset, `docs-${id}.tgz`)
    }
  })

  it('defaults repo to rxova/<id> and lets an entry override it', () => {
    assert.equal(resolveSource(entry()).repo, 'rxova/foo')
    assert.equal(resolveSource(entry({ repo: 'other/foo' })).repo, 'other/foo')
  })

  it('treats a missing `enabled` as disabled', () => {
    // A project you forgot to enable is a missing docs section; one you forgot
    // to disable is a failed deploy. Default to the recoverable one.
    assert.equal(resolveSource(entry({ enabled: undefined })).enabled, false)
    assert.equal(resolveSource(entry({ enabled: 'yes' })).enabled, false)
    assert.equal(resolveSource(entry({ enabled: true })).enabled, true)
  })
})

describe('resolveSource — validation', () => {
  it('rejects ids that are not URL- and shell-safe', () => {
    for (const id of [undefined, '', 'Foo', 'foo bar', '-foo', 'foo/bar', 'foo_bar', 42]) {
      assert.throws(() => resolveSource(entry({ id })), /needs an "id"/)
    }
  })

  it('prefixes every error with the file, so CI output says where to look', () => {
    assert.throws(
      () => resolveSource({}),
      (err) => err.message.startsWith('sources.json: '),
    )
  })
})

describe('loadRegistry', () => {
  it('rejects duplicate ids', () => {
    const file = writeRegistry({ sources: [entry(), entry()] })
    assert.throws(() => loadRegistry(file), /duplicate id "foo"/)
  })

  it('reports unreadable or malformed json without a stack trace', () => {
    assert.throws(() => loadRegistry(writeRegistry('{ nope')), /could not be read or parsed/)
    assert.throws(() => loadRegistry('/no/such/sources.json'), /could not be read or parsed/)
  })

  it('defaults the landing mount when the file omits it', () => {
    const { landing } = loadRegistry(writeRegistry({ sources: [] }))
    assert.deepEqual(landing, { artifact: 'landing', mount: '.' })
  })

  it('tolerates a registry with no sources at all', () => {
    const registry = loadRegistry(writeRegistry({ sources: [] }))
    assert.deepEqual(registry.sources, [])
    assert.deepEqual(enabledSources(registry), [])
  })

  it('enabledSources returns only the enabled ones', () => {
    const file = writeRegistry({
      sources: [entry({ id: 'on' }), entry({ id: 'off', enabled: false })],
    })
    assert.deepEqual(
      enabledSources(loadRegistry(file)).map((s) => s.id),
      ['on'],
    )
  })
})

describe('the real sources.json', () => {
  const registry = loadRegistry()

  it('loads', () => {
    assert.ok(registry.sources.length > 0, 'expected at least one project')
  })

  it('is the file the scripts actually read', () => {
    assert.match(SOURCES_FILE, /sources\.json$/)
  })

  it('never writes a derived path by hand', () => {
    // Writing these into the file is how they drift apart from the id.
    const raw = JSON.parse(readFileSync(SOURCES_FILE, 'utf8'))
    for (const s of raw.sources) {
      for (const derived of ['base', 'mount', 'artifact', 'releaseTag', 'releaseAsset']) {
        assert.equal(s[derived], undefined, `"${s.id}" writes derived field "${derived}"`)
      }
    }
  })

  it('gives every project a landing blurb and tags', () => {
    for (const s of registry.sources) {
      assert.ok(s.landing.blurb, `${s.id} has no landing.blurb`)
      assert.ok(s.landing.tags?.length, `${s.id} has no landing.tags`)
    }
  })
})
