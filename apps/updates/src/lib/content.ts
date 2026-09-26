/**
 * Loading helpers for the updates collections.
 * The pure half (ordering, bylines, dates, facets) lives in `entries.ts`, testable without a build.
 */

import { getCollection, getEntry, type CollectionEntry } from 'astro:content'

import { REPOS, type RepoId } from '@rxova/brand'

import { newestFirst, usedValues, byline, formatDate, isoDate } from '@rxova/astro-ui/lib/entries'

export { REPOS, type RepoId }
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
 * A URL inside this surface, prefixed with the configured base (`BASE_URL`).
 * Every internal link goes through here; a bare `/slug` would leave the mount.
 */
export function href(path = ''): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  return `${base}/${path}`.replace(/\/{2,}/g, '/')
}
