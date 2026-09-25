// The built-landing check: what it accepts, and each thing it refuses.

import { describe, it } from 'vitest'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { checkLanding } from './check-landing.mjs'

const sources = [
  { id: 'foo', kind: 'package', enabled: true, base: '/packages/foo/' },
  { id: 'bar', kind: 'package', enabled: false, base: '/packages/bar/' },
  { id: 'blog', kind: 'site', enabled: true, base: '/blog/' },
]

const overview = (id, { h1s = 1, canonical = `https://rxova.org/projects/${id}/` } = {}) =>
  `<html><head><link rel="canonical" href="${canonical}">` +
  `<meta property="og:image" content="https://rxova.org/og/${id}.png"></head>` +
  `<body>${'<h1>x</h1>'.repeat(h1s)}</body></html>`

/** A dist that passes; `over` replaces or adds files by relative path. */
function dist(over = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'rxova-landing-'))
  const files = {
    'index.html': '<a href="/projects/foo/"></a>',
    'projects/foo/index.html': overview('foo'),
    ...over,
  }
  for (const [path, html] of Object.entries(files)) {
    if (html === null) continue
    mkdirSync(join(dir, path, '..'), { recursive: true })
    writeFileSync(join(dir, path), html)
  }
  return dir
}

describe('checkLanding', () => {
  it('passes a complete build', () => {
    assert.deepEqual(checkLanding(dist(), sources), [])
  })

  it('fails when there is no build at all, rather than skipping', () => {
    const problems = checkLanding(join(tmpdir(), 'rxova-no-such-dist'), sources)
    assert.equal(problems.length, 1)
    assert.match(problems[0], /no index\.html/)
  })

  it('fails on a missing overview page for an enabled project', () => {
    assert.deepEqual(checkLanding(dist({ 'projects/foo/index.html': null }), sources), [
      '/projects/foo/ was not built',
    ])
  })

  it('fails when a disabled project has a page', () => {
    const problems = checkLanding(dist({ 'projects/bar/index.html': overview('bar') }), sources)
    // Its own canonical link is a link to a disabled project too.
    assert.deepEqual(problems, [
      '/projects/bar/ was built, but bar is disabled',
      'projects/bar/index.html links https://rxova.org/projects/bar/, but that project is disabled',
    ])
  })

  it('fails on a wrong canonical or more than one h1', () => {
    const problems = checkLanding(
      dist({ 'projects/foo/index.html': overview('foo', { h1s: 2, canonical: '/elsewhere' }) }),
      sources,
    )
    assert.equal(problems.length, 2)
  })

  it('fails when the home page does not link an overview', () => {
    const problems = checkLanding(dist({ 'index.html': '<a href="/"></a>' }), sources)
    assert.deepEqual(problems, ['the home page does not link /projects/foo/'])
  })

  it('fails on a link to a disabled project, relative or absolute', () => {
    const problems = checkLanding(
      dist({
        'about/index.html':
          '<a href="/packages/bar/"></a><a href="https://rxova.org/packages/bar/x/"></a>' +
          '<a href="/projects/bar/"></a>',
      }),
      sources,
    )
    assert.equal(problems.length, 3)
  })

  it('ignores the shell templates, which are build inputs', () => {
    const problems = checkLanding(
      dist({ 'shell-templates/bar/index.html': '<a href="/packages/bar/"></a>' }),
      sources,
    )
    assert.deepEqual(problems, [])
  })
})
