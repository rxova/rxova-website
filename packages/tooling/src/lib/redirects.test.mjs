// A redirect is a promise about a URL that is already out in the world — in a
// search index, in someone's bookmarks. The expensive mistake is not a missing
// redirect but a confidently wrong one, so most of what is tested here is the
// refusal to publish a stub that would land on a 404 or bury a real page.

import { describe, it, beforeEach, afterAll } from 'vitest'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { loadRedirects, writeRedirects, stubDocument } from './redirects.mjs'

const roots = []
let root
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'rxova-redirects-'))
  roots.push(root)
})
afterAll(() => {
  for (const dir of roots) rmSync(dir, { recursive: true, force: true })
})

const ORIGIN = 'https://rxova.org'

function write(path, body) {
  const full = join(root, path)
  mkdirSync(join(full, '..'), { recursive: true })
  writeFileSync(full, body)
}

/** Write redirects.json into the temp root and load it back through the validator. */
function config(redirects) {
  write('redirects.json', JSON.stringify({ redirects }))
  return loadRedirects(join(root, 'redirects.json'))
}

describe('loadRedirects', () => {
  it('reads a well-formed map', async () => {
    assert.deepEqual(await config({ '/docs/devtool/examples/': '/packages/journey/bridge/' }), {
      '/docs/devtool/examples/': '/packages/journey/bridge/',
    })
  })

  it('refuses a source that is not a rooted directory path', async () => {
    await assert.rejects(config({ 'docs/old/': '/new/' }), /rooted directory path/)
    await assert.rejects(config({ '/docs/old': '/new/' }), /rooted directory path/)
  })

  it('refuses a target that is not rooted, which would resolve relative to the stub', async () => {
    await assert.rejects(config({ '/docs/old/': 'packages/new/' }), /rooted path/)
  })

  it('refuses a redirect to itself', async () => {
    await assert.rejects(config({ '/docs/old/': '/docs/old/' }), /redirects to itself/)
  })

  it('refuses a chain, which needs two hops to resolve', async () => {
    await assert.rejects(
      config({ '/a/': '/b/', '/b/': '/c/' }),
      /"\/a\/" points at "\/b\/", which is itself a redirect/,
    )
  })

  it('refuses a key nobody modelled, rather than ignoring a typo', async () => {
    write('redirects.json', JSON.stringify({ redirect: { '/a/': '/b/' } }))
    await assert.rejects(loadRedirects(join(root, 'redirects.json')), /invalid/)
  })

  it('reports an unreadable file as such', async () => {
    await assert.rejects(loadRedirects(join(root, 'nope.json')), /could not be read or parsed/)
  })
})

describe('stubDocument', () => {
  it('carries both signals: a refresh for browsers, a canonical for crawlers', () => {
    const html = stubDocument('/packages/journey/bridge/protocol/', ORIGIN)

    assert.match(
      html,
      /http-equiv="refresh" content="0; url=\/packages\/journey\/bridge\/protocol\/"/,
    )
    assert.match(
      html,
      /<link rel="canonical" href="https:\/\/rxova\.org\/packages\/journey\/bridge\/protocol\/" \/>/,
    )
  })
})

describe('writeRedirects', () => {
  it('materialises a stub at the old path', async () => {
    write('packages/journey/bridge/protocol/index.html', 'the real page')

    await writeRedirects(
      root,
      { '/docs/devtool/protocol/': '/packages/journey/bridge/protocol/' },
      ORIGIN,
    )

    const stub = readFileSync(join(root, 'docs/devtool/protocol/index.html'), 'utf8')
    assert.match(stub, /url=\/packages\/journey\/bridge\/protocol\//)
  })

  it('refuses to publish a redirect into a 404', async () => {
    await assert.rejects(
      writeRedirects(
        root,
        { '/docs/devtool/protocol/': '/packages/journey/bridge/protocol/' },
        ORIGIN,
      ),
      /target\(s\) missing from the assembled site/,
    )
    assert.equal(existsSync(join(root, 'docs/devtool/protocol/index.html')), false)
  })

  it('names every broken target, not just the first', async () => {
    await assert.rejects(
      writeRedirects(root, { '/a/': '/gone/', '/b/': '/also-gone/' }, ORIGIN),
      /\/a\/ -> \/gone\/[\s\S]*\/b\/ -> \/also-gone\//,
    )
  })

  it('refuses to bury a page that still exists', async () => {
    write('about/index.html', 'the real about page')
    write('packages/journey/index.html', 'docs')

    await assert.rejects(
      writeRedirects(root, { '/about/': '/packages/journey/' }, ORIGIN),
      /source\(s\) are real pages on the site/,
    )
    assert.equal(readFileSync(join(root, 'about/index.html'), 'utf8'), 'the real about page')
  })

  it('does nothing, loudly or otherwise, when there are no redirects', async () => {
    assert.deepEqual(await writeRedirects(root, {}, ORIGIN), [])
  })
})
