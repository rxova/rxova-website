/**
 * Loading helpers for the updates collections.
 *
 * The pure half — ordering, bylines, dates, facets — lives in `entries.ts`, which
 * imports nothing from Astro so it can be tested without booting a build.
 */

import { getCollection, getEntry, type CollectionEntry } from 'astro:content'

import { REPOS, type RepoId } from '@rxova/brand'

import { newestFirst, usedValues, byline, formatDate, isoDate } from '@rxova/astro-ui/lib/entries'

export { REPOS, type RepoId }
export { byline, formatDate, isoDate }

export type UpdateEntry = CollectionEntry<'updates'>

/**
 * Updates, newest first, ties broken on slug so the order is reproducible. Sketches
 * are excluded in production.
 *
 * The filter belongs here rather than at a page, because this is the one place the
 * collection is read: the stream, the repo pages and the filter chips all derive from
 * it, so a sketch drops out of every one of them together. A sketch still renders
 * under `astro dev`, so it can be read in place before it ships.
 */
export async function getUpdates(): Promise<UpdateEntry[]> {
  const entries = await getCollection('updates', ({ data }) => import.meta.env.DEV || !data.draft)
  return newestFirst(entries, (e) => e.data.date)
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
      if (!entry) throw new Error(`[updates] author "${id}" has no entry`)
      return { id, name: entry.data.name, url: entry.data.url }
    }),
  )
}

const REPO_LABELS = new Map(REPOS.map((r) => [r.id as string, r.label]))

export function repoLabel(id: string): string {
  return REPO_LABELS.get(id) ?? id
}

/** Only the repos some entry actually mentions — an empty filter chip is noise. */
export function usedRepos(entries: readonly UpdateEntry[]): { id: string; label: string }[] {
  const used = new Set(usedValues(entries, (e) => e.data.repos as string[]))
  return REPOS.filter((r) => used.has(r.id)).map((r) => ({ id: r.id as string, label: r.label }))
}

/** Same, for tags. The enum is the vocabulary; this is what is in use. */
export function usedTags(entries: readonly UpdateEntry[]): string[] {
  return usedValues(entries, (e) => e.data.tags as string[]).sort()
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
