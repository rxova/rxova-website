// The registry is the single source of truth for what rxova.org is made of, and
// everything downstream — the ingest gate, the deploy-time fetch, the assembler —
// trusts whatever it returns. These tests pin the two things that trust rests on:
// the derivation (id -> base/mount/artifact/release, which must agree with itself
// or the site 404s) and the validation (what it refuses, so a bad entry fails in
// `pnpm test` and `pnpm check:registry` rather than mid-deploy).

import { describe, it } from 'vitest'
import assert from 'node:assert/strict'
import { writeFileSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { resolveSource, loadRegistry, enabledSources, SOURCES_FILE } from './registry.mjs'

/**
 * Minimum *valid* entry; individual tests override the field under test.
 *
 * It carries landing copy because `sourceEntry` requires it of a package — a
 * package gets a card on the home page and there would be nothing to put on it.
 * That rule used to live in the landing build, and moved into the shared schema
 * when this repo started importing it, so a fixture without copy is no longer a
 * realistic entry.
 */
const entry = (over = {}) => ({
  id: 'foo',
  enabled: true,
  landing: { blurb: 'A blurb.', tags: ['Tag'] },
  ...over,
})

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
    assert.equal(resolveSource(entry({ enabled: true })).enabled, true)
  })

  // Stricter than the hand-rolled check this replaced, which read `enabled === true`
  // and so quietly treated `"true"` as disabled — a project silently not deploying,
  // with a sources.json that looks like it should.
  it('refuses a non-boolean `enabled` rather than coercing it to false', () => {
    for (const enabled of ['yes', 'true', 1, null]) {
      assert.throws(() => resolveSource(entry({ enabled })), /expected boolean/)
    }
  })
})

describe('resolveSource — validation', () => {
  it('rejects ids that are not URL- and shell-safe', () => {
    // The message comes from @rxova/website-schemas now, so assert on the field
    // rather than the wording — the rule is shared, the phrasing is not ours.
    for (const id of [undefined, '', 'Foo', 'foo bar', '-foo', 'foo/bar', 'foo_bar', 42]) {
      assert.throws(() => resolveSource(entry({ id })), /id —/)
    }
  })

  // `.strict()`, so a field nobody modelled is refused rather than ignored. This is
  // the case that matters: `enable` for `enabled` would otherwise parse clean and
  // leave a project silently undeployed.
  it('rejects a key it does not know', () => {
    assert.throws(() => resolveSource(entry({ enable: true })), /Unrecognized key/)
    assert.throws(() => resolveSource(entry({ mount: 'packages/foo' })), /Unrecognized key/)
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

  // Only the packages get landing cards. `kind: "site"` entries are surfaces of
  // rxova.org — /blog, /updates — with no npm package and nothing to describe on
  // the home page, so they carry no landing copy and the landing filters them out.
  it('gives every package a landing blurb and tags', () => {
    for (const s of registry.sources.filter((s) => s.kind === 'package')) {
      assert.ok(s.landing.blurb, `${s.id} has no landing.blurb`)
      assert.ok(s.landing.tags?.length, `${s.id} has no landing.tags`)
    }
  })

  it('mounts the site surfaces at the root, not under /packages', () => {
    for (const s of registry.sources.filter((s) => s.kind === 'site')) {
      assert.equal(s.base, `/${s.id}/`)
      assert.equal(s.mount, s.id)
    }
  })
})

describe('kinds', () => {
  it('defaults to package, so entries written before kinds kept their meaning', () => {
    const s = resolveSource(entry({ kind: undefined }))
    assert.equal(s.kind, 'package')
    assert.equal(s.base, '/packages/foo/')
  })

  it('derives a root mount for a site', () => {
    const s = resolveSource({ id: 'blog', kind: 'site' })
    assert.equal(s.kind, 'site')
    assert.equal(s.base, '/blog/')
    assert.equal(s.mount, 'blog')
    // The artifact and release names stay uniform, so ingest and fetch-docs need
    // to know nothing about kinds.
    assert.equal(s.artifact, 'docs-blog')
    assert.equal(s.releaseTag, 'content-blog')
  })

  // Silently treating an unknown kind as a package would mount a surface at a path
  // nothing links to, which is a 404 nobody goes looking for.
  it('refuses a kind it does not know', () => {
    assert.throws(() => resolveSource({ id: 'foo', kind: 'website' }), /expected one of/)
  })

  it('keeps base and mount in agreement for every kind', () => {
    for (const kind of ['package', 'site']) {
      // A site carries no landing copy — the schema refuses it there, since a site
      // gets no card for it to appear on.
      const s = resolveSource(kind === 'site' ? { id: 'foo', kind } : entry({ kind }))
      assert.equal(s.base, `/${s.mount}/`)
    }
  })
})
