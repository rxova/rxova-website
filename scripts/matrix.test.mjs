// The matrix decides which projects a deploy builds and at which refs. Getting
// it wrong is expensive in a way that is hard to notice: a dispatch that
// silently builds everyone's default ref looks exactly like a successful deploy,
// except the docs the dispatch was announcing are not in it.
//
// `resolveOverride` reads the event, `buildMatrix` applies it. Both are pure, so
// every dispatch shape below is exercised here rather than by pushing to main.

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { resolveOverride, buildMatrix } from './matrix.mjs'
import { resolveSource, loadRegistry } from './registry.mjs'

const registry = (...raw) => ({
  landing: { artifact: 'landing', mount: '.' },
  sources: raw.map((r) => resolveSource({ build: 'b', enabled: true, ...r })),
})

const THREE = registry({ id: 'journey' }, { id: 'react-inputs' }, { id: 'use-everywhere' })

describe('resolveOverride', () => {
  it('is empty for a plain push', () => {
    assert.deepEqual(resolveOverride({}), { project: null, ref: null })
  })

  it('reads the current `docs` dispatch payload', () => {
    const got = resolveOverride({
      EVENT_ACTION: 'docs',
      CLIENT_PAYLOAD: JSON.stringify({ project: 'journey', ref: 'abc123' }),
    })
    assert.deepEqual(got, { project: 'journey', ref: 'abc123' })
  })

  it('still honours the legacy per-project dispatch types', () => {
    // The sibling repos migrate to `docs` one at a time; until they all have,
    // docs-<id> has to keep working or their deploys stop.
    const got = resolveOverride({
      EVENT_ACTION: 'docs-use-everywhere',
      CLIENT_PAYLOAD: JSON.stringify({ ref: 'v2' }),
    })
    assert.deepEqual(got, { project: 'use-everywhere', ref: 'v2' })
  })

  it('accepts a legacy dispatch with no ref', () => {
    const got = resolveOverride({ EVENT_ACTION: 'docs-journey', CLIENT_PAYLOAD: '{}' })
    assert.deepEqual(got, { project: 'journey', ref: null })
  })

  it('prefers an explicit workflow_dispatch input over the event', () => {
    const got = resolveOverride({
      INPUT_PROJECT: ' journey ',
      INPUT_REF: ' fix/x ',
      EVENT_ACTION: 'docs-use-everywhere',
    })
    assert.deepEqual(got, { project: 'journey', ref: 'fix/x' })
  })

  it('treats a blank workflow_dispatch input as "build everything"', () => {
    // Running the workflow by hand with both boxes empty is the normal way to
    // force a full rebuild; it must not be read as a project named "".
    assert.deepEqual(resolveOverride({ INPUT_PROJECT: '', INPUT_REF: '' }), {
      project: null,
      ref: null,
    })
  })

  it('ignores an unrelated dispatch type', () => {
    assert.deepEqual(resolveOverride({ EVENT_ACTION: 'ping', CLIENT_PAYLOAD: '{}' }), {
      project: null,
      ref: null,
    })
  })

  it('rejects a `docs` dispatch with no project', () => {
    assert.throws(
      () => resolveOverride({ EVENT_ACTION: 'docs', CLIENT_PAYLOAD: '{"ref":"x"}' }),
      /must carry client_payload\.project/,
    )
  })

  it('rejects an unparseable payload instead of guessing', () => {
    assert.throws(
      () => resolveOverride({ EVENT_ACTION: 'docs', CLIENT_PAYLOAD: '{not json' }),
      /not valid JSON/,
    )
  })
})

describe('buildMatrix', () => {
  it('builds every enabled project, not just the one that dispatched', () => {
    // Pages deploys a whole tree: assemble needs an artifact for every mounted
    // project, or that project's docs vanish from the live site.
    const include = buildMatrix(THREE, { project: 'journey', ref: 'abc123' })
    assert.deepEqual(
      include.map((i) => i.id),
      ['journey', 'react-inputs', 'use-everywhere'],
    )
  })

  it('applies the dispatched ref only to the project that asked for it', () => {
    const include = buildMatrix(THREE, { project: 'journey', ref: 'abc123' })
    assert.deepEqual(
      include.map((i) => [i.id, i.ref]),
      [
        ['journey', 'abc123'],
        ['react-inputs', 'main'],
        ['use-everywhere', 'main'],
      ],
    )
  })

  it('leaves refs alone when nothing was dispatched', () => {
    for (const row of buildMatrix(THREE)) assert.equal(row.ref, 'main')
  })

  it('omits disabled projects', () => {
    const some = registry({ id: 'on' }, { id: 'off', enabled: false })
    assert.deepEqual(
      buildMatrix(some).map((i) => i.id),
      ['on'],
    )
  })

  it('carries exactly what the workflow needs, and no output path', () => {
    // Where a build lands is resolved on the runner from sources.json by
    // resolve-output.mjs. Re-adding it here would be a second source of truth.
    const [row] = buildMatrix(registry({ id: 'journey' }))
    assert.deepEqual(Object.keys(row).sort(), [
      'artifact',
      'base',
      'build',
      'id',
      'install',
      'ref',
      'repo',
      'workdir',
    ])
  })

  it('flattens multi-command builds into one run: block', () => {
    const [row] = buildMatrix(registry({ id: 'x', build: ['a', 'b'] }))
    assert.equal(row.build, 'a\nb')
  })

  it('derives the artifact name the assembler will look for', () => {
    const [row] = buildMatrix(registry({ id: 'use-everywhere' }))
    assert.equal(row.artifact, 'docs-use-everywhere')
    assert.equal(row.base, '/packages/use-everywhere/')
    assert.equal(row.workdir, 'use-everywhere')
  })

  it('fails loudly on a project id that is not in the registry', () => {
    // A typo'd dispatch would otherwise look like an ordinary full rebuild.
    assert.throws(() => buildMatrix(THREE, { project: 'jorney' }), /unknown project "jorney"/)
  })

  it('fails when a disabled project dispatches a build', () => {
    const some = registry({ id: 'off', enabled: false })
    assert.throws(() => buildMatrix(some, { project: 'off' }), /disabled in sources\.json/)
  })

  it('refuses a ref that could break out of the workflow yaml', () => {
    for (const ref of ['a; rm -rf /', '$(id)', 'a b', '`x`']) {
      assert.throws(() => buildMatrix(THREE, { project: 'journey', ref }), /refusing ref/)
    }
  })
})

describe('the real sources.json', () => {
  it('produces a matrix whose ids, artifacts and bases all agree', () => {
    for (const row of buildMatrix(loadRegistry())) {
      assert.equal(row.artifact, `docs-${row.id}`)
      assert.equal(row.base, `/packages/${row.id}/`)
      assert.equal(row.workdir, row.id)
      assert.ok(row.build.length > 0)
    }
  })
})
