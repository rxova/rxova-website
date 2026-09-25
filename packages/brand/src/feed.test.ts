import { describe, expect, it } from 'vitest'

import { escapeXml, renderFeed, rfc822, type FeedItem } from './feed.ts'

const item = (over: Partial<FeedItem> = {}): FeedItem => ({
  title: 'A post',
  link: 'https://rxova.org/blog/a-post/',
  description: 'What it is about.',
  pubDate: new Date('2026-08-03T09:00:00Z'),
  ...over,
})

describe('escapeXml', () => {
  it('escapes the five XML entities', () => {
    expect(escapeXml(`<a href="x">&'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&amp;&apos;&lt;/a&gt;',
    )
  })

  // The ordering bug this guards is silent: escape `<` before `&` and the
  // ampersand introduced by `&lt;` is escaped again, shipping `&amp;lt;`.
  it('does not double-escape the ampersands it introduces', () => {
    expect(escapeXml('a < b')).toBe('a &lt; b')
    expect(escapeXml('Tom & Jerry')).toBe('Tom &amp; Jerry')
  })
})

describe('rfc822', () => {
  // RSS 2.0 requires RFC 822 dates, not ISO 8601. A reader handed an ISO date
  // either drops the item or dates it "now", and both look like the feed works.
  it('formats as RFC 822, not ISO 8601', () => {
    expect(rfc822(new Date('2026-08-09T09:00:00Z'))).toBe('Sun, 09 Aug 2026 09:00:00 GMT')
  })
})

describe('renderFeed', () => {
  const base = {
    title: 'Rxova Blog',
    description: 'Essays from the Rxova projects.',
    siteUrl: 'https://rxova.org/blog/',
    feedUrl: 'https://rxova.org/blog/rss.xml',
  }

  it('renders a channel with a self-referencing atom link', () => {
    const xml = renderFeed({ ...base, items: [item()] })
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(xml).toContain('<title>Rxova Blog</title>')
    expect(xml).toContain(
      '<atom:link href="https://rxova.org/blog/rss.xml" rel="self" type="application/rss+xml" />',
    )
  })

  it('uses the entry URL as a permalink guid', () => {
    const xml = renderFeed({ ...base, items: [item()] })
    expect(xml).toContain('<guid isPermaLink="true">https://rxova.org/blog/a-post/</guid>')
  })

  it('keeps the order it was given', () => {
    const xml = renderFeed({
      ...base,
      items: [item({ title: 'Newer' }), item({ title: 'Older' })],
    })
    expect(xml.indexOf('Newer')).toBeLessThan(xml.indexOf('Older'))
  })

  it('dates the build from the newest item when not told otherwise', () => {
    const xml = renderFeed({ ...base, items: [item()] })
    expect(xml).toContain('<lastBuildDate>Mon, 03 Aug 2026 09:00:00 GMT</lastBuildDate>')
  })

  it('omits lastBuildDate for an empty feed rather than emitting an invalid date', () => {
    const xml = renderFeed({ ...base, items: [] })
    expect(xml).not.toContain('lastBuildDate')
    expect(xml).toContain('</channel>')
  })

  it('renders bylines as dc:creator, never as an email-shaped author', () => {
    const xml = renderFeed({ ...base, items: [item({ authors: ['Jonatan Kruszewski'] })] })
    expect(xml).toContain('<dc:creator>Jonatan Kruszewski</dc:creator>')
    expect(xml).not.toContain('<author>')
  })

  it('escapes titles that carry markup characters', () => {
    const xml = renderFeed({ ...base, items: [item({ title: 'Why <input> & you' })] })
    expect(xml).toContain('<title>Why &lt;input&gt; &amp; you</title>')
  })

  it('renders categories from tags', () => {
    const xml = renderFeed({ ...base, items: [item({ categories: ['react', 'intl'] })] })
    expect(xml).toContain('<category>react</category>')
    expect(xml).toContain('<category>intl</category>')
  })
})
