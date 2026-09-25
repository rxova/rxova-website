/**
 * RSS 2.0 for /blog.
 *
 * Prerendered like every other route: the surface is a static Astro build, so
 * this endpoint runs once and the aggregator publishes `rss.xml` verbatim
 * alongside the HTML (ingest copies the tree; only `.html` is ever rewritten).
 *
 * Item links are `canonicalUrl`, never `href()`. `href()` resolves against
 * `BASE_URL` so a link works wherever the surface is mounted — right for a page,
 * wrong for a feed, which is read off-site and must carry absolute production
 * URLs. The guid is that same URL, so re-dating a post never resurfaces it.
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
      // `description` is the summary written for search results and social
      // cards, which is exactly the job here too. The index uses the post's
      // opening instead; a feed reader is closer to a search result.
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
