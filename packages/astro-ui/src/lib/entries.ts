/** Ordering, bylines, dates, facets and excerpts shared by /blog and /updates. Pure, so tests need no Astro. */

/** Newest first, ties broken by `id` so the order never depends on filesystem order. Sorts a copy. */
export function newestFirst<T extends { id: string }>(entries: readonly T[], date: (e: T) => Date) {
  return [...entries].sort(
    (a, b) => date(b).valueOf() - date(a).valueOf() || a.id.localeCompare(b.id),
  )
}

/** "Rxova" · "Rxova and Ada" · "Rxova, Ada, and Grace" */
export function byline(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`
}

/** The distinct values some entry carries, so a filter row never offers a chip that matches nothing. */
export function usedValues<T>(entries: readonly T[], pick: (e: T) => readonly string[]): string[] {
  return [...new Set(entries.flatMap((e) => pick(e)))]
}

const DATE = new Intl.DateTimeFormat('en', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
})

/** "July 27, 2026". UTC, so the rendered date matches the filename it came from. */
export function formatDate(d: Date): string {
  return DATE.format(d)
}

/** `2026-07-27`, for `<time datetime>`. */
export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** The next "show more" limit: one `step` further, clamped to `total` so the control never outlives the list. */
export function nextLimit(current: number, step: number, total: number): number {
  return Math.min(current + Math.max(step, 0), total)
}

/**
 * The opening prose of a markdown body, up to `max` characters, cut on a word boundary.
 * Skips headings, images, quotes, code, tables and lists; reports whether anything was cut.
 */
export function excerpt(body: string, max: number): { text: string; truncated: boolean } {
  const prose = body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && !/^(#|!\[|>|```|\||-{3,}|\d+\.|[-*+]\s)/.test(p))
    .join(' ')

  const plain = prose
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/\s+/g, ' ')
    .trim()

  if (plain.length <= max) return { text: plain, truncated: false }

  const cut = plain.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return {
    text: (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[,;:.—–-]+$/, ''),
    truncated: true,
  }
}
