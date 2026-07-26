// The registry is the single source of truth for what rxova.org is made of, and
// everything downstream — the CI matrix, the output resolver, the assembler —
// trusts whatever it returns. These tests pin the two things that trust rests on:
// the derivation (id -> base/mount/artifact/workdir, which must agree with itself
// or the site 404s) and the validation (what it refuses, so a bad entry fails in
// `pnpm test` and `pnpm check:registry` rather than mid-deploy).

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  resolveSource,
  loadRegistry,
  enabledSources,
  DEFAULT_OUTPUT_CANDIDATES,
  SOURCES_FILE,
} from './registry.mjs'

/** Minimum viable entry; individual tests override the field under test. */
const entry = (over = {}) => ({ id: 'foo', enabled: true, build: ['pnpm docs:build'], ...over })

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
    assert.equal(s.workdir, 'use-everywhere')
  })

  it('keeps mount and base in agreement — a mismatch is what 404s the site', () => {
    for (const id of ['journey', 'react-inputs', 'a', 'x9-y']) {
      const s = resolveSource(entry({ id }))
      assert.equal(s.base, `/${s.mount}/`)
    }
  })

  it('defaults repo, ref and install, and lets an entry override them', () => {
    const plain = resolveSource(entry())
    assert.equal(plain.repo, 'rxova/foo')
    assert.equal(plain.ref, 'main')
    assert.equal(plain.install, 'pnpm install --frozen-lockfile')

    const overridden = resolveSource(entry({ repo: 'other/foo', ref: 'next', install: 'npm ci' }))
    assert.equal(overridden.repo, 'other/foo')
    assert.equal(overridden.ref, 'next')
    assert.equal(overridden.install, 'npm ci')
  })

  it('takes ref and install from the file-level defaults when the entry is silent', () => {
    const s = resolveSource(entry(), { ref: 'develop', install: 'yarn' })
    assert.equal(s.ref, 'develop')
    assert.equal(s.install, 'yarn')
  })

  it('treats a missing `enabled` as disabled', () => {
    // A project you forgot to enable is a missing docs section; one you forgot
    // to disable is a failed deploy. Default to the recoverable one.
    assert.equal(resolveSource(entry({ enabled: undefined })).enabled, false)
    assert.equal(resolveSource(entry({ enabled: 'yes' })).enabled, false)
    assert.equal(resolveSource(entry({ enabled: true })).enabled, true)
  })

  it('accepts a single build command as a string', () => {
    assert.deepEqual(resolveSource(entry({ build: 'pnpm docs' })).build, ['pnpm docs'])
  })
})

describe('resolveSource — output candidates', () => {
  it('defaults to Astro/Starlight first, then Docusaurus', () => {
    // Order is the whole point: use-everywhere's migration to Astro left a stale
    // `build/` behind in no-clean checkouts, and dist/ must win when both exist.
    assert.deepEqual(resolveSource(entry()).output, ['apps/docs/dist', 'apps/docs/build'])
    assert.deepEqual(DEFAULT_OUTPUT_CANDIDATES, ['apps/docs/dist', 'apps/docs/build'])
  })

  it('does not hand out the shared default array', () => {
    const a = resolveSource(entry({ id: 'a' }))
    const b = resolveSource(entry({ id: 'b' }))
    a.output.push('mutated')
    assert.deepEqual(b.output, DEFAULT_OUTPUT_CANDIDATES)
  })

  it('accepts a string or a list', () => {
    assert.deepEqual(resolveSource(entry({ output: 'out' })).output, ['out'])
    assert.deepEqual(resolveSource(entry({ output: ['a', 'b'] })).output, ['a', 'b'])
  })

  it('rejects paths that escape the project checkout', () => {
    // These are joined onto a checkout path and handed to upload-artifact.
    for (const bad of ['/etc', '../secrets', 'apps/../../etc', '..']) {
      assert.throws(() => resolveSource(entry({ output: bad })), /must be a relative path/)
    }
  })

  it('rejects an empty list and non-string entries', () => {
    assert.throws(() => resolveSource(entry({ output: [] })), /omit it to use the defaults/)
    assert.throws(() => resolveSource(entry({ output: [''] })), /non-string entry/)
    assert.throws(() => resolveSource(entry({ output: [null] })), /non-string entry/)
    assert.throws(() => resolveSource(entry({ output: [{}] })), /non-string entry/)
  })

  it('allows a path that merely contains dots', () => {
    assert.deepEqual(resolveSource(entry({ output: 'apps/docs/.output/public' })).output, [
      'apps/docs/.output/public',
    ])
  })
})

describe('resolveSource — validation', () => {
  it('rejects ids that are not URL- and shell-safe', () => {
    for (const id of [undefined, '', 'Foo', 'foo bar', '-foo', 'foo/bar', 'foo_bar', 42]) {
      assert.throws(() => resolveSource(entry({ id })), /needs an "id"/)
    }
  })

  it('rejects an entry with no build command', () => {
    assert.throws(() => resolveSource(entry({ build: undefined })), /needs a "build" command/)
    assert.throws(() => resolveSource(entry({ build: [] })), /needs a "build" command/)
  })

  it('rejects a ref that could break out of the workflow yaml', () => {
    // Refs arrive from a repository_dispatch payload, i.e. from outside this repo.
    for (const ref of ['main; rm -rf /', '$(whoami)', 'a b', '`x`', "it's"]) {
      assert.throws(() => resolveSource(entry({ ref })), /invalid ref/)
    }
    for (const ref of ['main', 'release/1.x', 'v1.2.3', 'a1b2c3d']) {
      assert.equal(resolveSource(entry({ ref })).ref, ref)
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
    // Writing base/mount/artifact/workdir into the file is how they drift apart.
    const raw = JSON.parse(readFileSync(SOURCES_FILE, 'utf8'))
    for (const s of raw.sources) {
      for (const derived of ['base', 'mount', 'artifact', 'workdir']) {
        assert.equal(s[derived], undefined, `"${s.id}" writes derived field "${derived}"`)
      }
    }
  })

  it('gives every project somewhere to build to and a landing blurb', () => {
    for (const s of registry.sources) {
      assert.ok(s.output.length > 0, `${s.id} has no output candidates`)
      assert.ok(s.build.length > 0, `${s.id} has no build commands`)
      assert.ok(s.landing.blurb, `${s.id} has no landing.blurb`)
      assert.ok(s.landing.tags?.length, `${s.id} has no landing.tags`)
    }
  })
})
