/**
 * RSS 2.0 for /updates. Items link to their stable `/updates/#<id>` anchor, which keeps guids unique.
 * Descriptions are derived from the body, since updates have no `description` field.
 */
import type { APIRoute } from 'astro'

import { canonicalUrl, renderFeed, type FeedItem } from '@rxova/brand'

import { getUpdates, resolveAuthors, repoLabel } from '../lib/content'
import { feedExcerpt } from '../lib/feed'

export const GET: APIRoute = async () => {
  const entries = await getUpdates()
  const index = canonicalUrl('/updates')

  const items: FeedItem[] = await Promise.all(
    entries.map(async (entry) => ({
      title: entry.data.version ? `${entry.data.title} (${entry.data.version})` : entry.data.title,
      link: `${index}#${entry.id}`,
      description: feedExcerpt(entry.body ?? ''),
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
