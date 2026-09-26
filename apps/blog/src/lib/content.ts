/**
 * Loading helpers for the blog's collections.
 * The pure half (ordering, bylines, dates) lives in `entries.ts`, testable without a build.
 */

import { getCollection, getEntry, type CollectionEntry } from 'astro:content'

import { newestFirst, byline, formatDate, isoDate } from '@rxova/astro-ui/lib/entries'

export { byline, formatDate, isoDate }

export type Post = CollectionEntry<'blog'>

/** Posts, newest first; drafts are excluded in production but still render under `astro dev`. */
export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection('blog', ({ data }) => import.meta.env.DEV || !data.draft)
  return newestFirst(posts, (p) => p.data.pubDate)
}

/**
 * Resolve author references to their entries.
 * `reference()` already fails the build on an unknown id, so a miss here throws.
 */
export async function resolveAuthors(
  refs: readonly { id: string }[],
): Promise<{ id: string; name: string; url?: string }[]> {
  return Promise.all(
    refs.map(async ({ id }) => {
      const entry = await getEntry('authors', id)
      if (!entry) throw new Error(`[blog] author "${id}" has no entry`)
      return { id, name: entry.data.name, url: entry.data.url }
    }),
  )
}

/**
 * A URL inside this surface, prefixed with the configured base (`BASE_URL`).
 * Every internal link goes through here; a bare `/slug` would leave the mount.
 */
export function href(path = ''): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  return `${base}/${path}`.replace(/\/{2,}/g, '/')
}
