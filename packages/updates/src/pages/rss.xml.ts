/**
 * RSS 2.0 for /updates.
 *
 * Every item links to `/updates/#<id>` rather than to a page of its own, because
 * that is genuinely where the entry lives: the stream renders each update in
 * full and `UpdatesStream.astro` already gives every one a stable `#slug`
 * anchor. Those anchors are what make the guids unique — without them a reader
 * would collapse the whole feed into one item pointing at the index.
 *
 * The description is derived from the body. An update has no `description` in
 * its frontmatter (the stream shows the whole thing, so there was never a
 * summary to write), and deriving one beats adding a field to every entry
 * already published.
 */
import type { APIRoute } from 'astro'

import { canonicalUrl, renderFeed, type FeedItem } from '@rxova/brand'

import { getUpdates, resolveAuthors, repoLabel } from '../lib/content'
import { excerpt } from '../lib/entries'

export const GET: APIRoute = async () => {
  const entries = await getUpdates()
  const index = canonicalUrl('/updates')

  const items: FeedItem[] = await Promise.all(
    entries.map(async (entry) => ({
      title: entry.data.version ? `${entry.data.title} (${entry.data.version})` : entry.data.title,
      link: `${index}#${entry.id}`,
      description: excerpt(entry.body ?? ''),
      pubDate: entry.data.date,
      authors: (await resolveAuthors(entry.data.authors)).map((a) => a.name),
      // Both facets the stream filters by, so a reader can tell at a glance
      // which project an entry is about without opening it.
      categories: [...entry.data.repos.map((id) => repoLabel(id)), ...entry.data.tags],
    })),
  )

  return new Response(
    renderFeed({
      title: 'Rxova Updates',
      description: 'What is moving across the Rxova projects — releases, fixes and infrastructure.',
      siteUrl: index,
      feedUrl: `${index}rss.xml`,
      items,
    }),
    { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } },
  )
}
