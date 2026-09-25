/**
 * The entry filename contract, shared by everything that reads one.
 *
 * Both surfaces parse their markdown filenames with `parseEntryFilename`, and this
 * repo's validator checks the result against the frontmatter — so a name means the
 * same thing to whatever writes it and whatever renders it.
 */

/**
 * The entry filename contract: `2026-07-27T143005-some-slug.md`.
 *
 * A full UTC timestamp to the second, then the slug. The prefix exists so the
 * directory sorts in an editor the way the site sorts, and nothing else — the URL
 * is the slug alone.
 *
 * ## Why not literally `toISOString()`
 *
 * Because `2026-07-27T14:30:05.000Z` contains colons, and Windows will not have a
 * colon in a filename — a repo with one cannot be cloned there at all. So the time
 * is compact, which is ISO 8601's own *basic* format, and `new Date()` happens not
 * to accept it.
 *
 * That is what `stampToISO` is for. Reconstructing the colons is one regex, so this
 * needs no library — but it needed writing once rather than in each of the places
 * that read these names.
 */
export const ENTRY_FILENAME =
  /^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3])([0-5]\d)([0-5]\d)-([a-z0-9][a-z0-9-]*)\.md$/

export interface ParsedEntryFilename {
  /** `2026-07-27T143005` — exactly as it appears in the name. */
  stamp: string
  /** `2026-07-27T14:30:05.000Z` — what `Date#toISOString` would give. */
  iso: string
  date: Date
  /** `some-slug`, which is the URL. */
  slug: string
}

/** `2026-07-27T143005` -> `2026-07-27T14:30:05.000Z`. */
export function stampToISO(stamp: string): string {
  return `${stamp.slice(0, 11)}${stamp.slice(11, 13)}:${stamp.slice(13, 15)}:${stamp.slice(15, 17)}.000Z`
}

/** `Date` -> `2026-07-27T143005`, the form a filename carries. */
export function isoToStamp(date: Date): string {
  const iso = date.toISOString()
  return `${iso.slice(0, 11)}${iso.slice(11, 13)}${iso.slice(14, 16)}${iso.slice(17, 19)}`
}

/** Parse an entry filename, or `null` if it does not match the contract. */
export function parseEntryFilename(name: string): ParsedEntryFilename | null {
  const m = ENTRY_FILENAME.exec(name)
  if (!m) return null
  const stamp = `${m[1]}T${m[2]}${m[3]}${m[4]}`
  const iso = stampToISO(stamp)
  return { stamp, iso, date: new Date(iso), slug: m[5]! }
}

/** Author files carry no timestamp — the filename is the id. */
export const AUTHOR_FILENAME = /^([a-z0-9][a-z0-9-]*)\.md$/
