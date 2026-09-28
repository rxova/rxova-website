/**
 * Loading helpers for the updates collection.
 * The pure half (ordering, bylines, dates, facets) lives in `entries.ts`, testable without a build.
 */

import { getCollection, type CollectionEntry } from 'astro:content'

import { REPOS } from '@rxova/brand'

import { newestFirst, usedValues, byline, formatDate, isoDate } from '@rxova/astro-ui/lib/entries'

export { REPOS }
export { resolveAuthors } from './authors'
export { byline, formatDate, isoDate }

export type UpdateEntry = CollectionEntry<'updates'>

/**
 * Updates, newest first, ties broken on slug. The one place the collection is read, so
 * sketches drop out of every view in production; they still render under `astro dev`.
 */
export async function getUpdates(): Promise<UpdateEntry[]> {
  const entries = await getCollection('updates', ({ data }) => import.meta.env.DEV || !data.draft)
  return newestFirst(entries, (e) => e.data.date)
}

const REPO_LABELS = new Map(REPOS.map((r) => [r.id as string, r.label]))

export function repoLabel(id: string): string {
  return REPO_LABELS.get(id) ?? id
}

/** Only the repos some entry actually mentions — an empty filter chip is noise. */
export function usedRepos(entries: readonly UpdateEntry[]): { id: string; label: string }[] {
  const used = new Set(usedValues(entries, (e) => e.data.repos))
  return REPOS.filter((r) => used.has(r.id)).map((r) => ({ id: r.id, label: r.label }))
}

/** Same, for tags. The enum is the vocabulary; this is what is in use. */
export function usedTags(entries: readonly UpdateEntry[]): string[] {
  return usedValues(entries, (e) => e.data.tags as string[]).sort()
}

/** A page URL under `/updates/`, ending in `/` so GitHub Pages serves it without a redirect. */
export function href(path = ''): string {
  return `/updates/${path}/`.replace(/\/{2,}/g, '/')
}
