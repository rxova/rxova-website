/**
 * Loading helpers for the blog collection.
 * The pure half (ordering, bylines, dates) lives in `@rxova/astro-ui/lib/entries`, testable without a build.
 */

import { getCollection, type CollectionEntry } from 'astro:content'

import { newestFirst, byline, formatDate, isoDate } from '@rxova/astro-ui/lib/entries'

export { resolveAuthors } from './authors'
export { byline, formatDate, isoDate }

export type Post = CollectionEntry<'blog'>

/** Posts, newest first; drafts are excluded in production but still render under `astro dev`. */
export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection('blog', ({ data }) => import.meta.env.DEV || !data.draft)
  return newestFirst(posts, (p) => p.data.pubDate)
}

/** A URL under `/blog/`. Every internal blog link goes through here. */
export function href(path = ''): string {
  return `/blog/${path}`.replace(/\/{2,}/g, '/')
}
