/** The entry filename contract, shared by both surfaces and this repo's validator. */

/**
 * `2026-07-27T143005-some-slug.md`: a UTC timestamp for sort order, then the slug (the URL).
 * The time is ISO 8601 basic format (no colons, for Windows); `stampToISO` converts it back.
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
