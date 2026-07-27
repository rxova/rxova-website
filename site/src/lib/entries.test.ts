/**
 * Ordering, bylines, dates and facets for /blog and /updates.
 *
 * The one that earns its keep is `newestFirst`. Its contract is that the same
 * content always produces the same order — without that, CI and a local build can
 * disagree about what the index looks like, and nothing about the page would tell
 * you which one was right.
 */

import { describe, expect, it } from 'vitest'

import { newestFirst, byline, usedValues, formatDate, isoDate } from './entries'

const at = (id: string, iso: string) => ({ id, date: new Date(iso) })
const byDate = (e: { date: Date }) => e.date

describe('newestFirst', () => {
  it('puts the newest first', () => {
    const sorted = newestFirst(
      [at('a', '2026-07-27T09:00:00Z'), at('b', '2026-07-28T09:00:00Z')],
      byDate,
    )
    expect(sorted.map((e) => e.id)).toEqual(['b', 'a'])
  })

  it('orders within a single day by time, not by name', () => {
    const sorted = newestFirst(
      [at('zulu', '2026-07-27T09:00:00Z'), at('alpha', '2026-07-27T14:00:00Z')],
      byDate,
    )
    expect(sorted.map((e) => e.id)).toEqual(['alpha', 'zulu'])
  })

  // The tiebreak. Ties are unlikely with second precision, but "unlikely" is not
  // "deterministic", and a filesystem-ordered index is the bug this prevents.
  it('breaks a same-instant tie by id, ascending', () => {
    const same = '2026-07-27T09:00:00Z'
    expect(newestFirst([at('b', same), at('a', same)], byDate).map((e) => e.id)).toEqual(['a', 'b'])
  })

  it('gives the same answer whatever order it is handed', () => {
    const same = '2026-07-27T09:00:00Z'
    const input = [at('c', same), at('a', same), at('b', '2026-07-28T09:00:00Z')]
    const forwards = newestFirst(input, byDate).map((e) => e.id)
    const backwards = newestFirst([...input].reverse(), byDate).map((e) => e.id)
    expect(forwards).toEqual(backwards)
    expect(forwards).toEqual(['b', 'a', 'c'])
  })

  // Astro hands over its own collection array; sorting it in place would leak this
  // ordering into every other consumer of that collection.
  it('does not mutate the input', () => {
    const input = [at('b', '2026-07-27T09:00:00Z'), at('a', '2026-07-28T09:00:00Z')]
    const before = input.map((e) => e.id)
    newestFirst(input, byDate)
    expect(input.map((e) => e.id)).toEqual(before)
  })

  it('handles an empty list and a single entry', () => {
    expect(newestFirst([], byDate)).toEqual([])
    expect(newestFirst([at('a', '2026-07-27T09:00:00Z')], byDate).map((e) => e.id)).toEqual(['a'])
  })
})

describe('byline', () => {
  it.each([
    [[], ''],
    [['Rxova'], 'Rxova'],
    [['Rxova', 'Ada'], 'Rxova and Ada'],
    [['Rxova', 'Ada', 'Grace'], 'Rxova, Ada, and Grace'],
    [['A', 'B', 'C', 'D'], 'A, B, C, and D'],
  ])('renders %j as "%s"', (names, expected) => {
    expect(byline(names)).toBe(expected)
  })
})

describe('usedValues', () => {
  const entries = [{ tags: ['fix', 'infra'] }, { tags: ['fix'] }, { tags: [] }]

  it('collects the distinct values across every entry', () => {
    expect(usedValues(entries, (e) => e.tags).sort()).toEqual(['fix', 'infra'])
  })

  it('is empty when nothing carries a value', () => {
    expect(usedValues([{ tags: [] }], (e) => e.tags)).toEqual([])
    expect(usedValues([], (e: { tags: string[] }) => e.tags)).toEqual([])
  })

  it('preserves first-seen order, which is the order the chips render in', () => {
    expect(usedValues(entries, (e) => e.tags)).toEqual(['fix', 'infra'])
  })
})

describe('formatDate', () => {
  it('renders a long-form date', () => {
    expect(formatDate(new Date('2026-07-27T14:30:05Z'))).toBe('July 27, 2026')
  })

  // Formatted in UTC on purpose: the filename, the frontmatter and the validator
  // all speak UTC, so a machine in UTC-5 must not render the previous day.
  it('formats in UTC, not the machine timezone', () => {
    expect(formatDate(new Date('2026-07-27T02:00:00Z'))).toBe('July 27, 2026')
    expect(formatDate(new Date('2026-07-27T23:00:00Z'))).toBe('July 27, 2026')
  })
})

describe('isoDate', () => {
  it('gives the UTC date for <time datetime>', () => {
    expect(isoDate(new Date('2026-07-27T14:30:05Z'))).toBe('2026-07-27')
  })

  it('rolls to the UTC day, not the local one', () => {
    expect(isoDate(new Date('2026-07-27T23:30:05-05:00'))).toBe('2026-07-28')
  })
})
