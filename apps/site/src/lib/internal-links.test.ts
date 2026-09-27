import { describe, expect, it } from 'vitest'

import { internalLinkProblems, localHref } from './internal-links'

const a = (href: string) => `<p><a class="x" href="${href}">x</a></p>`

describe('internalLinkProblems', () => {
  it.each([
    '/',
    '/blog/',
    '/blog/some-post/',
    '/#principles',
    '/projects/',
    '/updates/?repo=journey',
    '/blog/rss.xml',
    '/llms.txt',
    '#top',
    'mailto:jonatan@rxova.org',
    'https://github.com/rxova',
    '//cdn.example.com/x',
  ])('accepts %s', (href) => {
    expect(internalLinkProblems(a(href))).toEqual([])
  })

  it('flags an absolute link to rxova.org', () => {
    expect(internalLinkProblems(a('https://rxova.org/blog/'))).toEqual([
      'https://rxova.org/blog/: absolute rxova.org link; use a root-relative path',
    ])
  })

  it('flags a relative link', () => {
    expect(internalLinkProblems(a('repos/journey/'))).toEqual([
      'repos/journey/: relative link; use a root-relative path',
    ])
  })

  it.each(['/blog', '/projects', '/updates/repos/journey?x=1'])(
    'flags %s, a page without its trailing slash',
    (href) => {
      expect(internalLinkProblems(a(href))).toEqual([
        `${href}: page link without a trailing slash, which GitHub Pages redirects`,
      ])
    },
  )

  it('reads every anchor on the page, and ignores link and img tags', () => {
    const html = `${a('/ok/')}${a('/bad')}<link rel="icon" href="/x"><img src="/y">`
    expect(internalLinkProblems(html)).toHaveLength(1)
  })
})

describe('localHref', () => {
  it.each([
    ['https://rxova.org', '/'],
    ['https://rxova.org/', '/'],
    ['https://rxova.org/blog/test-post', '/blog/test-post/'],
    ['https://rxova.org/packages/journey/', '/packages/journey/'],
    ['https://rxova.org/packages/x/errors#ue1001', '/packages/x/errors/#ue1001'],
    ['https://rxova.org/updates?repo=journey', '/updates/?repo=journey'],
    ['https://rxova.org/blog/rss.xml', '/blog/rss.xml'],
  ])('turns %s into %s', (href, local) => {
    expect(localHref(href)).toBe(local)
  })

  it.each(['https://github.com/rxova', 'https://rxova.org.evil.example/', '/blog/'])(
    'leaves %s alone, not being an absolute rxova.org URL',
    (href) => {
      expect(localHref(href)).toBeUndefined()
    },
  )
})
