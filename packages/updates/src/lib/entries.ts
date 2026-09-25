/**
 * The pure half of the blog and updates logic: ordering, bylines, dates, facets.
 *
 * Split out of `content.ts` because that module imports `astro:content`, a virtual
 * module only Astro can resolve — so nothing there can be imported by a test, or by
 * anything else, without booting Astro.
 *
 * Nothing here reaches for the brand checkout either. `usedValues` is parameterised
 * rather than importing `REPOS`, because `src/external` is a deploy-time checkout
 * that does not exist when the tests run.
 */

/**
 * Newest first, with a deterministic tiebreak on `id`.
 *
 * Frontmatter carries a full UTC timestamp, so ties are already unlikely. When two
 * entries do land on the same second they fall back to the id, ascending —
 * arbitrary, but *fixed*.
 *
 * Fixed is the point. Without a tiebreak the order would come from whatever
 * sequence the glob loader read the directory in, which is filesystem order: stable
 * on one machine, not guaranteed to match on another. The index could then sort
 * itself differently in CI than it did locally.
 *
 * Sorts a copy — the caller's array is usually a collection Astro handed over, and
 * mutating it would leak the ordering into every other consumer.
 */
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

/**
 * The distinct values some entry actually carries, for a filter row.
 *
 * Offering a chip that matches nothing is noise, so the filters are built from what
 * has been written about rather than from the full registry or the full tag enum.
 */
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

/**
 * How far to open a batched list up next: one `step` further, never past `total`.
 *
 * Clamping matters because the caller renders the "show more" control from
 * `limit < total`. Letting the limit run past the end would leave the control on
 * screen with nothing left to reveal, and the click would do nothing.
 *
 * `current` above `total` — a filter that just shrank the list under an already
 * raised limit — clamps back down rather than growing further.
 */
export function nextLimit(current: number, step: number, total: number): number {
  return Math.min(current + Math.max(step, 0), total)
}

/**
 * How much of an entry to put in the feed, in characters.
 *
 * Shorter than the blog's 200: an update is already short, and a feed reader shows
 * this under a headline rather than as the body of a card.
 */
export const FEED_EXCERPT_CHARS = 160

/**
 * The opening of an entry, as plain prose, for the RSS description.
 *
 * An update has no `description` in its frontmatter — the stream renders each one
 * in full, so there was never a summary to write. The feed needs one anyway, and
 * deriving it is better than adding a field to every entry already written.
 *
 * Mirrors the blog's `excerpt` deliberately, the way the rest of this file mirrors
 * its counterpart: strips the markdown that would otherwise leak into a reader,
 * skips headings and images, and truncates on a word boundary.
 */
export function excerpt(body: string, max = FEED_EXCERPT_CHARS): string {
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

  if (plain.length <= max) return plain

  const cut = plain.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[,;:.—–-]+$/, '')}…`
}
