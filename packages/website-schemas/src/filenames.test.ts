/**
 * The filename contract.
 *
 * Shared by this repo's validator and both surfaces' collections, so a regression
 * here changes what a name means in three places at once.
 */

import { describe, expect, it } from 'vitest'

import {
  ENTRY_FILENAME,
  AUTHOR_FILENAME,
  parseEntryFilename,
  stampToISO,
  isoToStamp,
} from './filenames.ts'

describe('parseEntryFilename', () => {
  it('splits a well-formed name into stamp, iso, date and slug', () => {
    expect(parseEntryFilename('2026-07-27T143005-some-slug.md')).toEqual({
      stamp: '2026-07-27T143005',
      iso: '2026-07-27T14:30:05.000Z',
      date: new Date('2026-07-27T14:30:05.000Z'),
      slug: 'some-slug',
    })
  })

  it('produces exactly what Date#toISOString would', () => {
    const parsed = parseEntryFilename('2026-07-27T143005-x.md')!
    expect(parsed.date.toISOString()).toBe(parsed.iso)
  })

  // The reason the separator is `T` and not another dash: `2024` is both a fine
  // slug fragment and a fine 20:24, so a dash here would make the name ambiguous.
  it('does not mistake a slug starting with four digits for a time', () => {
    const parsed = parseEntryFilename('2026-07-27T143005-2024-retrospective.md')
    expect(parsed?.slug).toBe('2024-retrospective')
    expect(parsed?.stamp).toBe('2026-07-27T143005')
  })

  it.each([
    ['2026-07-27T000000-midnight.md', '00:00:00'],
    ['2026-07-27T235959-last-second.md', '23:59:59'],
  ])('accepts the boundary time in %s', (name, time) => {
    expect(parseEntryFilename(name)?.iso).toBe(`2026-07-27T${time}.000Z`)
  })

  it.each([
    ['a bare date', '2026-07-27-some-slug.md'],
    ['a time with no seconds', '2026-07-27T1430-some-slug.md'],
    ['hour 24', '2026-07-27T240000-some-slug.md'],
    ['minute 60', '2026-07-27T146000-some-slug.md'],
    ['second 60', '2026-07-27T143060-some-slug.md'],
    ['colons, which Windows refuses', '2026-07-27T14:30:05-some-slug.md'],
    ['no slug', '2026-07-27T143005-.md'],
    ['an uppercase slug', '2026-07-27T143005-Some-Slug.md'],
    ['a slug opening with a dash', '2026-07-27T143005--slug.md'],
    ['no extension', '2026-07-27T143005-some-slug'],
    ['the wrong extension', '2026-07-27T143005-some-slug.mdx'],
  ])('rejects %s', (_label, name) => {
    expect(parseEntryFilename(name)).toBeNull()
  })

  // The regex has no /g flag, so lastIndex cannot carry between calls — but that
  // is a one-character mistake away and would make every second call fail.
  it('is stateless across calls', () => {
    const name = '2026-07-27T143005-some-slug.md'
    expect(parseEntryFilename(name)).not.toBeNull()
    expect(parseEntryFilename(name)).not.toBeNull()
    expect(ENTRY_FILENAME.lastIndex).toBe(0)
  })
})

describe('stampToISO / isoToStamp', () => {
  it('round-trips a stamp through a Date and back', () => {
    const stamp = '2026-07-27T143005'
    expect(isoToStamp(new Date(stampToISO(stamp)))).toBe(stamp)
  })

  it.each(['2026-01-01T000000', '2026-12-31T235959', '2024-02-29T120000'])(
    'round-trips %s',
    (stamp) => {
      expect(isoToStamp(new Date(stampToISO(stamp)))).toBe(stamp)
    },
  )

  it('drops sub-second precision, which filenames do not carry', () => {
    expect(isoToStamp(new Date('2026-07-27T14:30:05.789Z'))).toBe('2026-07-27T143005')
  })

  // A non-UTC input is the trap the docs warn about: the stamp is always the UTC
  // instant, never the local wall clock it was written as.
  it('normalises a local-offset date to UTC', () => {
    expect(isoToStamp(new Date('2026-07-27T23:30:05-05:00'))).toBe('2026-07-28T043005')
  })
})

describe('AUTHOR_FILENAME', () => {
  it.each(['rxova.md', 'ada-lovelace.md', 'a1.md'])('accepts %s', (name) => {
    expect(AUTHOR_FILENAME.test(name)).toBe(true)
  })

  it.each(['Rxova.md', '-rxova.md', 'rxova.mdx', '2026-07-27T143005-rxova.md'])(
    'rejects %s',
    (name) => {
      expect(AUTHOR_FILENAME.test(name)).toBe(false)
    },
  )
})
