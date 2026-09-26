/**
 * RSS 2.0 for /blog, prerendered and published verbatim by the aggregator.
 * Links and guids are absolute `canonicalUrl`s, never `href()`: a feed is read off-site.
 */
import type { APIRoute } from 'astro'

import { canonicalUrl, renderFeed, type FeedItem } from '@rxova/brand'

import { getPosts, resolveAuthors } from '../lib/content'

export const GET: APIRoute = async () => {
  const posts = await getPosts()

  const items: FeedItem[] = await Promise.all(
    posts.map(async (post) => ({
      title: post.data.title,
      link: canonicalUrl(`/blog/${post.id}`),
      // The summary written for search results and social cards; a feed reader is
      // closer to a search result than the index is.
      description: post.data.description,
      pubDate: post.data.pubDate,
      authors: (await resolveAuthors(post.data.authors)).map((a) => a.name),
      categories: post.data.tags,
    })),
  )

  return new Response(
    renderFeed({
      title: 'Rxova Blog',
      description:
        'Design rationale from the Rxova projects — things that broke, and why the obvious approach was not the one taken.',
      siteUrl: canonicalUrl('/blog'),
      feedUrl: `${canonicalUrl('/blog')}rss.xml`,
      items,
    }),
    { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } },
  )
}
