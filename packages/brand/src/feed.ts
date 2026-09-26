/**
 * Hand-written RSS 2.0 for the rxova.org surfaces that publish a stream (/blog and /updates).
 * No Node-only imports, so it stays importable from an Astro endpoint in any runtime.
 */

/** Escapes text for an XML node or attribute; `&` goes first so entities aren't double-escaped. */
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

/** RFC 822 date, as RSS 2.0 requires; `toUTCString()` yields exactly that, locale-independent. */
export const rfc822 = (date: Date): string => date.toUTCString()

/**
 * A complete RSS 2.0 document; bylines use `dc:creator` because `<author>` must be an email.
 * Items are emitted in the order given (callers pass them newest-first).
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
