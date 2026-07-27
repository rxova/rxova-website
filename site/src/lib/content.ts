/**
 * Loading helpers for the blog and updates collections.
 *
 * The collections themselves are defined in `src/content.config.ts`, which reads
 * markdown out of a checkout of `rxova/brand` — see docs/CONTENT-ARCHITECTURE.md
 * for why the content is not in this repo.
 *
 * Everything here runs at build time. `astro build` is static, so a throw fails
 * the build (and CI) rather than shipping a half-correct page.
 */

import { getCollection, getEntry, type CollectionEntry } from 'astro:content'

// Straight out of the checkout rather than the installed @rxova/brand, on purpose.
// An update names a repo, and brand's validator checked it against the
// REPOS list sitting in the same commit as that entry. Reading the npm copy here
// would reintroduce the gap: a repo added to brand but not yet released would
// build fine over there and fail here.
import { REPOS, type RepoId } from '../external/packages/brand/src/sites.ts'

export { REPOS, type RepoId }

export type Post = CollectionEntry<'blog'>
export type UpdateEntry = CollectionEntry<'updates'>
export type Author = CollectionEntry<'authors'>

/**
 * Newest first, with a deterministic tiebreak.
 *
 * More than one entry a day is normal, and a bare `2026-07-27` parses to midnight
 * for all of them — so sorting on the date alone leaves ties in whatever order the
 * glob loader happened to read the directory. That is filesystem order: stable on
 * one machine, not guaranteed to match on another, which means the index could
 * order itself differently in CI than it did locally.
 *
 * So ties fall back to the slug, ascending. Arbitrary, but *fixed* — and an author
 * who cares about the order within a day can say so by giving the frontmatter a
 * time (`2026-07-27T14:30:00Z`), which sorts properly and wins over this.
 */
function newestFirst<T extends { id: string }>(entries: T[], date: (e: T) => Date): T[] {
  return entries.sort((a, b) => date(b).valueOf() - date(a).valueOf() || a.id.localeCompare(b.id))
}

/**
 * Posts, newest first, drafts excluded in production.
 *
 * Drafts still render under `pnpm dev` so a post can be previewed exactly as it
 * will look — the flag only gates what ships.
 */
export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection('blog', ({ data }) => import.meta.env.DEV || !data.draft)
  return newestFirst(posts, (p) => p.data.pubDate)
}

/** Updates, newest first. */
export async function getUpdates(): Promise<UpdateEntry[]> {
  return newestFirst(await getCollection('updates'), (e) => e.data.date)
}

/**
 * Resolve a list of author references to their entries.
 *
 * `reference()` already failed the build if an id had no file, so a miss here is
 * impossible rather than merely unlikely — but it throws instead of rendering an
 * empty byline, because "impossible" is exactly the thing worth asserting.
 */
export async function resolveAuthors(
  refs: readonly { id: string }[],
): Promise<{ id: string; name: string; url?: string }[]> {
  return Promise.all(
    refs.map(async ({ id }) => {
      const entry = await getEntry('authors', id)
      if (!entry) throw new Error(`[content] author "${id}" has no entry`)
      return { id, name: entry.data.name, url: entry.data.url }
    }),
  )
}

/** "Rxova" · "Rxova and Ada" · "Rxova, Ada, and Grace" */
export function byline(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`
}

const REPO_LABELS = new Map(REPOS.map((r) => [r.id as string, r.label]))

export function repoLabel(id: string): string {
  return REPO_LABELS.get(id) ?? id
}

/** Only the repos some entry actually mentions — an empty filter chip is noise. */
export function usedRepos(entries: readonly UpdateEntry[]): typeof REPOS {
  const used = new Set(entries.flatMap((e) => e.data.repos as string[]))
  return REPOS.filter((r) => used.has(r.id)) as unknown as typeof REPOS
}

/** Same, for tags. The enum is the vocabulary; this is what is in use. */
export function usedTags(entries: readonly UpdateEntry[]): string[] {
  const used = new Set(entries.flatMap((e) => e.data.tags as string[]))
  return [...used].sort()
}

const DATE = new Intl.DateTimeFormat('en', { year: 'numeric', month: 'long', day: 'numeric' })

export function formatDate(d: Date): string {
  return DATE.format(d)
}

/** `2026-07-27`, for `<time datetime>`. */
export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}
