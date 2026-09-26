/**
 * Loading helpers for the blog's collections.
 *
 * The pure half — ordering, bylines, dates — lives in `entries.ts`, which imports
 * nothing from Astro so it can be tested without booting a build.
 */

import { getCollection, getEntry, type CollectionEntry } from 'astro:content'

import { newestFirst, byline, formatDate, isoDate } from './entries'

export { byline, formatDate, isoDate }

export type Post = CollectionEntry<'blog'>

/**
 * Posts, newest first, drafts excluded in production.
 *
 * Drafts still render under `astro dev` so a post can be previewed exactly as it
 * will look — the flag only gates what ships.
 */
export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection('blog', ({ data }) => import.meta.env.DEV || !data.draft)
  return newestFirst(posts, (p) => p.data.pubDate)
}

/**
 * Resolve author references to their entries.
 *
 * `reference()` already failed the build if an id had no file, so a miss here is
 * impossible rather than unlikely — which is exactly why it is worth asserting
 * instead of rendering an empty byline.
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
 * A URL inside this surface.
 *
 * The app is built for whatever base the aggregator will mount it at, so a bare
 * `/some-slug` would resolve against the origin and leave the mount entirely. Astro
 * exposes the configured base as BASE_URL; everything internal goes through here.
 */
export function href(path = ''): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  return `${base}/${path}`.replace(/\/{2,}/g, '/')
}
