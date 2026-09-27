/** The updates stream's filter, URL and batching rules, apart from the DOM so they can be unit-tested. */

/** The repos and tags the stream is narrowed to. Empty means unfiltered. */
export interface Filters {
  repo: Set<string>
  tag: Set<string>
}

/** What an entry is filed under, from its `data-repos` and `data-tags`. */
export interface Facets {
  repos: readonly string[]
  tags: readonly string[]
}

const list = (value: string | null | undefined, separator: string): string[] =>
  (value ?? '').split(separator).filter(Boolean)

/** An entry's facets from its space-separated data attributes. */
export const facets = (repos?: string, tags?: string): Facets => ({
  repos: list(repos, ' '),
  tags: list(tags, ' '),
})

/** Filters from a querystring such as `?repo=journey,brand&tag=fix`. */
export function readFilters(search: string): Filters {
  const params = new URLSearchParams(search)
  return {
    repo: new Set(list(params.get('repo'), ',')),
    tag: new Set(list(params.get('tag'), ',')),
  }
}

/** The URL describing `filters`, keeping the path and the `#entry` the reader is on. */
export function filtersUrl(pathname: string, filters: Filters, hash: string): string {
  const params = new URLSearchParams()
  if (filters.repo.size) params.set('repo', [...filters.repo].join(','))
  if (filters.tag.size) params.set('tag', [...filters.tag].join(','))
  const qs = params.toString()
  return `${pathname}${qs ? `?${qs}` : ''}${hash}`
}

export const isFiltered = (filters: Filters): boolean =>
  filters.repo.size > 0 || filters.tag.size > 0

/** Any value within a facet, every facet across them: "journey or brand, and tagged fix". */
export function matches({ repos, tags }: Facets, filters: Filters): boolean {
  const repoOk = filters.repo.size === 0 || repos.some((r) => filters.repo.has(r))
  const tagOk = filters.tag.size === 0 || tags.some((t) => filters.tag.has(t))
  return repoOk && tagOk
}

/** Where an entry stands: `hidden` by a filter ("you asked not to see this"), or `beyond` the batch ("not yet"). */
export interface Placement {
  hidden: boolean
  beyond: boolean
}

/** Places every entry for `filters` and a batch of `limit` matching entries. */
export function place(
  entries: readonly Facets[],
  filters: Filters,
  limit: number,
): { placements: Placement[]; matching: number; shown: number } {
  let matching = 0
  let shown = 0
  const placements = entries.map((entry) => {
    if (!matches(entry, filters)) return { hidden: true, beyond: false }
    matching++
    const within = shown < limit
    if (within) shown++
    return { hidden: false, beyond: !within }
  })
  return { placements, matching, shown }
}

/** "3 of 12 entries" while filtered; counts matches, not the batch. */
export function countText(matching: number, total: number, filtered: boolean): string {
  return filtered ? `${matching} of ${total} ${total === 1 ? 'entry' : 'entries'}` : ''
}

/** "Showing 8 of 20" while part of the matches is batched away. */
export function progressText(shown: number, matching: number): string {
  return shown < matching ? `Showing ${shown} of ${matching}` : ''
}
