/**
 * RSS 2.0 for the rxova.org surfaces that publish a stream.
 *
 * Hand-written rather than `@astrojs/rss`, for the same reason rxova-website
 * hand-writes its sitemaps: this is a few hundred bytes of well-specified XML,
 * both consumers are static Astro builds where the feed is one prerendered
 * endpoint, and the dependency would be carried by two packages to save a
 * `map()`. The escaping is the only part with teeth, and it is one function
 * with its own tests.
 *
 * Deliberately in `@rxova/brand` rather than in either consumer: /blog and
 * /updates are separate Astro projects that already share this package for
 * their chrome, and a feed each would be the same file twice — which is how
 * their two document shells came to differ before `SiteShell` existed.
 *
 * Node-only imports are avoided so this stays importable from an Astro
 * endpoint in any runtime.
 */

/**
 * Escape text for an XML text node or attribute value.
 *
 * `&` first, or the ampersands introduced by the later replacements get escaped
 * a second time and `<` ships as `&amp;lt;`.
 */
export const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

export interface FeedItem {
  title: string
  /** Absolute URL. Also used as the guid, which is why it must be stable. */
  link: string
  description: string
  pubDate: Date
  /** Plain author names. Rendered as `<dc:creator>`, not `<author>`. */
  authors?: readonly string[]
  categories?: readonly string[]
}

export interface FeedOptions {
  title: string
  description: string
  /** Absolute URL of the page this feed describes. */
  siteUrl: string
  /** Absolute URL of the feed document itself, for `atom:link rel="self"`. */
  feedUrl: string
  items: readonly FeedItem[]
  /** Defaults to the newest item's date. */
  lastBuildDate?: Date
}

/**
 * RFC 822, which is what RSS 2.0 requires — not ISO 8601.
 *
 * `toUTCString()` produces exactly this shape ("Sun, 09 Aug 2026 09:00:00 GMT")
 * and is locale-independent, so it is used directly rather than assembled from
 * day and month tables that would need their own test.
 */
export const rfc822 = (date: Date): string => date.toUTCString()

/**
 * A complete RSS 2.0 document.
 *
 * `dc:creator` carries bylines because RSS's own `<author>` element is specified
 * as an email address, and publishing the maintainer's address to every
 * aggregator that has ever scraped a feed is not worth a byline.
 *
 * Items are emitted in the order given; both callers hand them over newest-first
 * already, and re-sorting here would quietly disagree with the page the feed
 * describes.
 */
export function renderFeed({
  title,
  description,
  siteUrl,
  feedUrl,
  items,
  lastBuildDate,
}: FeedOptions): string {
  const newest = items[0]?.pubDate
  const built = lastBuildDate ?? newest

  const entries = items.map((item) => {
    const parts = [
      `      <title>${escapeXml(item.title)}</title>`,
      `      <link>${escapeXml(item.link)}</link>`,
      // Permalink: the URL is the identity, so a re-dated entry keeps its guid
      // and does not resurface in every reader as a new item.
      `      <guid isPermaLink="true">${escapeXml(item.link)}</guid>`,
      `      <description>${escapeXml(item.description)}</description>`,
      `      <pubDate>${rfc822(item.pubDate)}</pubDate>`,
      ...(item.authors ?? []).map((a) => `      <dc:creator>${escapeXml(a)}</dc:creator>`),
      ...(item.categories ?? []).map((c) => `      <category>${escapeXml(c)}</category>`),
    ]
    return `    <item>\n${parts.join('\n')}\n    </item>`
  })

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>${escapeXml(siteUrl)}</link>
    <description>${escapeXml(description)}</description>
    <language>en</language>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />${
      built ? `\n    <lastBuildDate>${rfc822(built)}</lastBuildDate>` : ''
    }
${entries.join('\n')}
  </channel>
</rss>
`
}
