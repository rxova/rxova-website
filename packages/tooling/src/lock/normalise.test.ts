import { describe, expect, it } from 'vitest'

import {
  maskAssetHashes,
  maskScopeIds,
  normaliseCss,
  normaliseHtml,
  normaliseText,
  splitPageStyles,
  stripCssComments,
  stripHtmlComments,
} from './normalise.ts'

describe('maskAssetHashes', () => {
  it.each([
    ['/_astro/index.Dblw5D6P.css', '/_astro/index.[hash].css'],
    ['/_astro/BaseLayout.B03-7n4U.css', '/_astro/BaseLayout.[hash].css'],
    ['/blog/_astro/ec.0vx5m.js', '/blog/_astro/ec.[hash].js'],
    [
      'url(/_astro/space-grotesk-latin-400-normal.CJ-V5oYT.woff2)',
      'url(/_astro/space-grotesk-latin-400-normal.[hash].woff2)',
    ],
  ])('masks %s', (input, expected) => {
    expect(maskAssetHashes(input)).toBe(expected)
  })

  it('leaves unhashed and non-asset paths alone', () => {
    const text = '/rxova-logo-256.png /og/journey.png /_astro/a.b.css'
    expect(maskAssetHashes(text)).toBe(text)
  })
})

describe('maskScopeIds', () => {
  it('masks scope ids in markup and selectors alike', () => {
    expect(maskScopeIds('<p data-astro-cid-z4jru4n3>')).toBe('<p data-cid>')
    expect(maskScopeIds('p[data-astro-cid-z4jru4n3]{}')).toBe('p[data-cid]{}')
  })
})

describe('comments', () => {
  it('strips HTML and CSS comments', () => {
    expect(stripHtmlComments('a<!-- one\ntwo -->b')).toBe('ab')
    expect(stripCssComments('a{}/* one\ntwo */b{}')).toBe('a{}b{}')
  })
})

describe('splitPageStyles', () => {
  const read = async (href: string) => (href === '/a.css' ? 'a{color:red}' : undefined)

  it('pulls linked and inline CSS out in document order', async () => {
    const page =
      '<html><head><link rel="stylesheet" href="/a.css"><style>b{color:blue}</style></head>' +
      '<body><p>x</p><style>c{color:green}</style></body></html>'
    const { html, css } = await splitPageStyles(page, read)
    expect(css).toBe('a{color:red}\nb{color:blue}\nc{color:green}')
    expect(html).not.toMatch(/<style|stylesheet/)
    expect(html).toContain('<p>x</p>')
  })

  it('marks a stylesheet it cannot read instead of dropping it silently', async () => {
    const { css } = await splitPageStyles('<link rel="stylesheet" href="/missing.css">', read)
    expect(css).toBe('@unresolved-stylesheet "/missing.css";')
  })

  it('keeps other links and looks inside templates', async () => {
    const page =
      '<link rel="icon" href="/i.png"><link href="/no-rel"><link rel="stylesheet">' +
      '<template><style>d{}</style></template>'
    const { html, css } = await splitPageStyles(page, read)
    expect(html).toContain('rel="icon"')
    expect(css).toBe('@unresolved-stylesheet "";\nd{}')
  })
})

describe('normalisers', () => {
  it('formats HTML with comments, hashes and scope ids masked', async () => {
    const html = await normaliseHtml(
      '<!-- note --><div data-astro-cid-abc123><img src="/_astro/x.AbCdEf12.png"></div>',
    )
    expect(html).toBe('<div data-cid><img src="/_astro/x.[hash].png" /></div>\n')
  })

  it('formats CSS the same way', async () => {
    expect(await normaliseCss('/* c */p[data-astro-cid-abc123]{color:red}')).toBe(
      'p[data-cid] {\n  color: red;\n}\n',
    )
  })

  it('leaves unparseable CSS as it is rather than failing', async () => {
    expect(await normaliseCss('a{')).toBe('a{')
  })

  it('formats JSON and masks hashes in any other text', async () => {
    expect(await normaliseText('{"a":"/_astro/x.AbCdEf12.js"}', '.json')).toBe(
      '{ "a": "/_astro/x.[hash].js" }\n',
    )
    expect(await normaliseText('see /_astro/x.AbCdEf12.js', '.txt')).toBe('see /_astro/x.[hash].js')
  })
})
