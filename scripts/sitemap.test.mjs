// The sitemap is the only file that tells Google the aggregate exists. Its
// failure mode is silent — a wrong or missing entry looks exactly like a correct
// one until pages quietly go unindexed for weeks — so what these tests pin down
// is the set of pages that must NOT be listed, and the delegation to each
// project's own sitemap.

import { describe, it, beforeEach, afterAll } from 'vitest'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  writeSitemaps,
  urlForFile,
  isIndexable,
  lastmodFor,
  SITEMAP_INDEX,
  SITEMAP_PAGES,
} from './sitemap.mjs'

const roots = []
let root
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'rxova-sitemap-'))
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

const page = (head = '') =>
  `<!doctype html><html><head>${head}</head><body><main>x</main></body></html>`
const read = (name) => readFileSync(join(root, name), 'utf8')
const locs = (xml) => [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1])

describe('urlForFile', () => {
  it('maps directory-style build output onto the URLs it is served at', () => {
    assert.equal(urlForFile('index.html'), '/')
    assert.equal(urlForFile('about/index.html'), '/about/')
    assert.equal(urlForFile('blog/test-post/index.html'), '/blog/test-post/')
  })
})

describe('isIndexable', () => {
  it('accepts an ordinary page', () => {
    assert.equal(isIndexable(page()), true)
  })

  it('rejects a page that asked not to be indexed', () => {
    assert.equal(isIndexable(page('<meta name="robots" content="noindex">')), false)
    assert.equal(isIndexable(page('<meta name="ROBOTS" content="noindex, follow">')), false)
  })

  it('rejects a redirect stub, which is not a destination', () => {
    assert.equal(isIndexable(page('<meta http-equiv="refresh" content="0; url=/x/">')), false)
  })

  it('is not fooled by a page merely mentioning the word', () => {
    assert.equal(isIndexable(page('<meta name="description" content="noindexing tips">')), true)
  })
})

describe('lastmodFor', () => {
  const ld = (obj) => `<script type="application/ld+json">${JSON.stringify(obj)}</script>`

  it('prefers dateModified over datePublished', () => {
    const html = ld({
      '@type': 'BlogPosting',
      datePublished: '2026-08-03T09:00:00.000Z',
      dateModified: '2026-08-07T11:00:00.000Z',
    })
    assert.equal(lastmodFor(html), '2026-08-07')
  })

  it('falls back to datePublished, then to a time element', () => {
    assert.equal(
      lastmodFor(ld({ '@type': 'BlogPosting', datePublished: '2026-08-03T09:00:00.000Z' })),
      '2026-08-03',
    )
    assert.equal(lastmodFor('<time datetime="2026-07-28T12:00:00.000Z">July</time>'), '2026-07-28')
  })

  // The whole point of the field. A page with nothing honest to say omits it,
  // rather than being stamped with the build date on every deploy — which would
  // claim the entire site changed daily and train Google to ignore the signal.
  it('returns undefined when the page claims no date', () => {
    assert.equal(lastmodFor('<html><body><main>No dates here</main></body></html>'), undefined)
  })

  it('survives unparseable JSON-LD rather than taking the sitemap down', () => {
    assert.equal(lastmodFor('<script type="application/ld+json">{ not json </script>'), undefined)
  })

  // SiteShell escapes `<` as < before embedding, so a real page's JSON-LD
  // is not byte-identical to what JSON.parse expects until that is undone.
  it('reads JSON-LD that was escaped for safe embedding', () => {
    const html =
      '<script type="application/ld+json">' +
      JSON.stringify({ '@type': 'BlogPosting', datePublished: '2026-08-03' }).replace(
        /</g,
        '\\u003c',
      ) +
      '</script>'
    assert.equal(lastmodFor(html), '2026-08-03')
  })
})

describe('writeSitemaps', () => {
  it('stamps lastmod only on pages that state a date', async () => {
    write('index.html', page())
    write(
      'blog/a-post/index.html',
      page('<script type="application/ld+json">{"datePublished":"2026-08-03T09:00:00Z"}</script>'),
    )

    await writeSitemaps(root, [], ORIGIN)
    const xml = read(SITEMAP_PAGES)

    assert.match(
      xml,
      /<loc>https:\/\/rxova\.org\/blog\/a-post\/<\/loc><lastmod>2026-08-03<\/lastmod>/,
    )
    assert.match(xml, /<loc>https:\/\/rxova\.org\/<\/loc><\/url>/)
  })

  it('lists the pages nobody else covers, at absolute URLs', async () => {
    write('index.html', page())
    write('about/index.html', page())
    write('blog/test-post/index.html', page())

    await writeSitemaps(root, [], ORIGIN)

    assert.deepEqual(locs(read(SITEMAP_PAGES)), [
      'https://rxova.org/',
      'https://rxova.org/about/',
      'https://rxova.org/blog/test-post/',
    ])
  })

  it('omits noindex pages, redirect stubs and the 404', async () => {
    write('index.html', page())
    write('privacy/index.html', page('<meta name="robots" content="noindex">'))
    write(
      'docs/devtool/protocol/index.html',
      page('<meta http-equiv="refresh" content="0; url=/p/">'),
    )
    write('404.html', page())

    await writeSitemaps(root, [], ORIGIN)

    assert.deepEqual(locs(read(SITEMAP_PAGES)), ['https://rxova.org/'])
  })

  it('defers to a project that ships its own sitemap instead of listing its pages', async () => {
    write('index.html', page())
    write('packages/journey/index.html', page())
    write('packages/journey/core/api/index.html', page())
    write(`packages/journey/${SITEMAP_INDEX}`, '<sitemapindex/>')

    const { children } = await writeSitemaps(root, [{ mount: 'packages/journey' }], ORIGIN)

    // Its pages appear once, under its own sitemap — not a second time under ours.
    assert.deepEqual(locs(read(SITEMAP_PAGES)), ['https://rxova.org/'])
    assert.deepEqual(children, ['packages/journey/sitemap-index.xml'])
    assert.deepEqual(locs(read(SITEMAP_INDEX)), [
      'https://rxova.org/sitemap-pages.xml',
      'https://rxova.org/packages/journey/sitemap-index.xml',
    ])
  })

  it('sweeps up a project that ships no sitemap of its own', async () => {
    write('index.html', page())
    write('updates/repos/journey/index.html', page())

    const { children } = await writeSitemaps(root, [{ mount: 'updates' }], ORIGIN)

    assert.deepEqual(children, [])
    assert.deepEqual(locs(read(SITEMAP_PAGES)), [
      'https://rxova.org/',
      'https://rxova.org/updates/repos/journey/',
    ])
  })

  // A Storybook build is an app shell plus `iframe.html`, the canvas frame every
  // story renders inside. Neither is a destination, and both were being offered
  // to Google because storybook ships no sitemap and so fell into the sweep.
  it('excludes a storybook surface entirely rather than sweeping its shell', async () => {
    write('index.html', page())
    write('storybook/react-inputs/index.html', page())
    write('storybook/react-inputs/iframe.html', page())

    const { children } = await writeSitemaps(
      root,
      [{ mount: 'storybook/react-inputs', kind: 'storybook' }],
      ORIGIN,
    )

    assert.deepEqual(locs(read(SITEMAP_PAGES)), ['https://rxova.org/'])
    assert.deepEqual(children, [])
  })

  it('points robots.txt at the root index', async () => {
    write('index.html', page())

    await writeSitemaps(root, [], ORIGIN)

    assert.match(read('robots.txt'), /^Sitemap: https:\/\/rxova\.org\/sitemap-index\.xml$/m)
  })

  // A comment, not a directive: an unknown robots.txt field risks taking the
  // whole file down in a strict parser. Pinned so the next refactor of this
  // string does not drop it silently.
  it('points humans reading robots.txt at the agent index', async () => {
    write('index.html', page())

    await writeSitemaps(root, [], ORIGIN)

    assert.match(read('robots.txt'), /^# .*: https:\/\/rxova\.org\/llms\.txt$/m)
  })

  it('honours a staging origin so a preview does not advertise production URLs', async () => {
    write('index.html', page())

    await writeSitemaps(root, [], 'https://web.rxova.org')

    assert.deepEqual(locs(read(SITEMAP_PAGES)), ['https://web.rxova.org/'])
  })
})
