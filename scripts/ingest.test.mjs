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
      kind: 'package',
      enabled: true,
      repo: 'rxova/journey',
      base: '/packages/journey/',
      mount: 'packages/journey',
      releaseTag: 'content-journey',
      releaseAsset: 'docs-journey.tgz',
    },
    {
      id: 'blog',
      kind: 'site',
      enabled: true,
      repo: 'rxova/brand',
      base: '/blog/',
      mount: 'blog',
      releaseTag: 'content-blog',
      releaseAsset: 'docs-blog.tgz',
    },
    {
      id: 'storybook-react-inputs',
      kind: 'storybook',
      enabled: true,
      repo: 'rxova/react-inputs',
      base: '/storybook/react-inputs/',
      mount: 'storybook/react-inputs',
      releaseTag: 'content-storybook-react-inputs',
      releaseAsset: 'docs-storybook-react-inputs.tgz',
    },
    {
      id: 'off',
      kind: 'package',
      enabled: false,
      repo: 'rxova/off',
      base: '/packages/off/',
      mount: 'packages/off',
      releaseTag: 'content-off',
      releaseAsset: 'docs-off.tgz',
    },
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
    // The workflow gates its deploy on this.
    assert.equal(meta.enabled, true)
    assert.equal(meta.schema, 2)
  })

  it('coerces a numeric run id and treats base as optional', () => {
    const { meta } = validateDispatch(registry, payload({ run_id: 42, base: undefined }))
    assert.equal(meta.runId, '42')
    assert.equal(meta.framework, 'other') // defaulted when the sender omits it
  })

  // The mount confinement check hardcoded `packages/<id>`, which predates
  // `kind: "site"` — it refused every /blog and /updates ingest outright.
  it('accepts a site surface, which mounts at the root rather than under packages/', () => {
    const { source } = validateDispatch(registry, payload({ project: 'blog', base: '/blog/' }))
    assert.equal(source.mount, 'blog')
    assert.equal(source.releaseTag, 'content-blog')
  })

  it('accepts a storybook surface, which nests under the shared /storybook/ tree', () => {
    const { source, meta } = validateDispatch(
      registry,
      payload({
        project: 'storybook-react-inputs',
        base: '/storybook/react-inputs/',
        schema: 1,
        framework: 'storybook',
      }),
    )
    assert.equal(source.mount, 'storybook/react-inputs')
    assert.equal(source.releaseTag, 'content-storybook-react-inputs')
    // The workshop senders declare their toolchain honestly rather than 'other'.
    assert.equal(meta.framework, 'storybook')
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
    assert.throws(() => validateDispatch(registry, null), /client_payload is invalid/)
    assert.throws(() => validateDispatch(registry, []), /client_payload is invalid/)
  })

  it('rejects an unsupported schema, so a sender on a newer contract fails loudly', () => {
    // The schema field is a literal in the shared contract, so a sender on a
    // newer one is refused by the parse rather than by a hand-written check.
    rejects({ schema: 3 }, /schema —/)
  })

  it('rejects an unknown project rather than ingesting docs nothing links to', () => {
    rejects({ project: 'nope' }, /unknown project "nope"/)
    rejects({ project: '' }, /project —/)
  })

  it('accepts a disabled project — the docs are persisted, just not deployed', () => {
    // The deadlock this removes: refusing a disabled project meant its docs could
    // not be stored until it was enabled, and enabling it made fetch-docs demand a
    // release that could not exist yet. Turning a project on always cost one red
    // deploy. Now the tree is waiting when the flag flips.
    const { source, meta } = validateDispatch(registry, payload({ project: 'off' }))
    assert.equal(source.id, 'off')
    assert.equal(meta.enabled, false)
  })

  it('rejects a base that disagrees with the mount — the classic 404-everything bug', () => {
    rejects({ base: '/packages/journeys/' }, /built for base/)
    // `/` is refused a step earlier, by the shared contract: no source mounts at
    // the root, so it is not a mount path at all rather than merely the wrong one.
    rejects({ base: '/' }, /base —/)
    rejects({ base: '/../../var/www/' }, /base —/)
  })

  it('rejects a sha, ref or run id that is not what it claims to be', () => {
    // Shapes are the shared contract's job now, so assert on the field rather than
    // wording nobody here owns. The values are what matters: run_id indexes an API
    // path, and ref and sha reach release notes.
    rejects({ sha: 'not-a-sha' }, /sha —/)
    rejects({ sha: undefined }, /sha —/)
    rejects({ ref: 'main; rm -rf /' }, /ref —/)
    rejects({ ref: '$(whoami)' }, /ref —/)
    rejects({ ref: '../../main' }, /ref —/)
    rejects({ ref: '--upload-pack=curl' }, /ref —/)
    rejects({ run_id: 'abc' }, /run_id —/)
    rejects({ run_id: undefined }, /run_id —/)
    rejects({ run_id: '1; rm -rf /' }, /run_id —/)
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

  it('validates a schema-2 page-component bundle', () => {
    dir = make()
    writeFileSync(
      join(dir, 'index.html'),
      '<!doctype html><html><body><main>Blog</main></body></html>',
    )
    writeFileSync(
      join(dir, 'rxova-page-bundle.json'),
      JSON.stringify({
        schema: 2,
        format: 'html-page-component',
        project: 'blog',
        base: '/blog/',
      }),
    )
    assert.deepEqual(checkDist(dir, { schema: 2, project: 'blog', base: '/blog/' }), { entries: 2 })
    rmSync(dir, { recursive: true, force: true })
  })

  it('rejects schema-2 bundles with their own analytics or global footer', () => {
    dir = make()
    writeFileSync(
      join(dir, 'rxova-page-bundle.json'),
      JSON.stringify({
        schema: 2,
        format: 'html-page-component',
        project: 'blog',
        base: '/blog/',
      }),
    )
    writeFileSync(
      join(dir, 'index.html'),
      '<main>Blog</main><script src="https://static.cloudflareinsights.com/beacon.min.js"></script>',
    )
    assert.throws(() => checkDist(dir, { schema: 2 }), /Cloudflare Analytics/)
    writeFileSync(join(dir, 'index.html'), '<main>Blog</main><footer class="rx-footer"></footer>')
    assert.throws(() => checkDist(dir, { schema: 2 }), /global Rxova footer/)
    rmSync(dir, { recursive: true, force: true })
  })

  // The playground case: a docs dist may legitimately carry HTML that is an
  // asset rather than a page — an iframe target has no <main> and must never be
  // composed. Without the marker the whole use-everywhere bundle was rejected.
  it('accepts a standalone asset with no <main>', () => {
    dir = make()
    writeFileSync(
      join(dir, 'rxova-page-bundle.json'),
      JSON.stringify({
        schema: 2,
        format: 'html-page-component',
        project: 'use-everywhere',
        base: '/packages/use-everywhere/',
      }),
    )
    writeFileSync(
      join(dir, 'index.html'),
      '<!doctype html><html><body><main>Docs</main></body></html>',
    )
    mkdirSync(join(dir, 'playground'), { recursive: true })
    writeFileSync(
      join(dir, 'playground', 'tab.html'),
      '<!doctype html><html><head><meta name="rxova-standalone" content=""></head><body><div id="root"></div></body></html>',
    )
    assert.deepEqual(checkDist(dir, { schema: 2 }), { entries: 3 })
    rmSync(dir, { recursive: true, force: true })
  })

  // The marker turns off the page-component rules, so it must not become a way
  // to smuggle the global chrome into the tree unnoticed.
  it('still rejects a page component with no <main> when unmarked', () => {
    dir = make()
    writeFileSync(
      join(dir, 'rxova-page-bundle.json'),
      JSON.stringify({
        schema: 2,
        format: 'html-page-component',
        project: 'blog',
        base: '/blog/',
      }),
    )
    writeFileSync(
      join(dir, 'index.html'),
      '<!doctype html><html><body><div>no main</div></body></html>',
    )
    assert.throws(() => checkDist(dir, { schema: 2 }), /has no <main> page component/)
    rmSync(dir, { recursive: true, force: true })
  })
})
