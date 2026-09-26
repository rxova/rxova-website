/**
 * Ordering, bylines, dates and facets for /blog and /updates.
 *
 * The one that earns its keep is `newestFirst`. Its contract is that the same
 * content always produces the same order — without that, CI and a local build can
 * disagree about what the index looks like, and nothing about the page would tell
 * you which one was right.
 */

import { describe, expect, it } from 'vitest'

import { newestFirst, byline, usedValues, formatDate, isoDate, excerpt, nextLimit } from './entries'

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

describe('excerpt', () => {
  it('returns the opening prose, untruncated when it fits', () => {
    const e = excerpt('Short and complete.', 200)
    expect(e).toEqual({ text: 'Short and complete.', truncated: false })
  })

  // Posts here open with a one-line hook, so stopping at the first paragraph would
  // put "This is a test post." on the card and nothing else.
  it('flows across paragraphs so a one-line opener still fills the card', () => {
    const e = excerpt('A hook.\n\nThen the actual point, at length.', 200)
    expect(e.text).toBe('A hook. Then the actual point, at length.')
  })

  it('cuts on a word boundary, never mid-word', () => {
    const e = excerpt('alpha bravo charlie delta', 14)
    expect(e).toEqual({ text: 'alpha bravo', truncated: true })
  })

  it('reports truncation, so the caller decides about the ellipsis', () => {
    expect(excerpt('a'.repeat(50), 200).truncated).toBe(false)
    expect(excerpt('word '.repeat(80), 200).truncated).toBe(true)
  })

  it('drops trailing punctuation left dangling by the cut', () => {
    expect(excerpt('one two three, four five', 15).text).toBe('one two three')
  })

  it('cuts mid-word only when the opening word alone overruns the budget', () => {
    expect(excerpt('supercalifragilistic', 5)).toEqual({ text: 'super', truncated: true })
  })

  it.each([
    ['links, keeping the text', 'See [the docs](https://x.dev) now.', 'See the docs now.'],
    ['inline code', 'Run `pnpm build` first.', 'Run pnpm build first.'],
    ['bold', 'This is **important** here.', 'This is important here.'],
    ['italic', 'This is _subtle_ here.', 'This is subtle here.'],
    ['images', 'Look ![alt](a.png) here.', 'Look here.'],
  ])('strips %s', (_label, input, expected) => {
    expect(excerpt(input, 200).text).toBe(expected)
  })

  // An excerpt opening on a heading or a quote reads as though the post begins
  // mid-thought.
  it.each([
    ['a heading', '# Title\n\nThe real opening.'],
    ['a blockquote', '> Someone else said this.\n\nThe real opening.'],
    ['a code fence', '```js\nconst x = 1\n```\n\nThe real opening.'],
    ['a list', '- one\n- two\n\nThe real opening.'],
  ])('skips %s', (_label, body) => {
    expect(excerpt(body, 200).text).toBe('The real opening.')
  })

  it('collapses whitespace, including hard-wrapped source', () => {
    expect(excerpt('one\ntwo   three', 200).text).toBe('one two three')
  })

  it('is empty for a post with no prose at all', () => {
    expect(excerpt('', 200)).toEqual({ text: '', truncated: false })
    expect(excerpt('# Only a heading', 200)).toEqual({ text: '', truncated: false })
  })
})

describe('nextLimit', () => {
  it('opens up by one step', () => {
    expect(nextLimit(10, 10, 24)).toBe(20)
  })

  // The clamp is the whole point: the caller shows the "show more" control while
  // `limit < total`, so a limit that overshot would leave a dead button on screen.
  it('stops at the total rather than overshooting', () => {
    expect(nextLimit(20, 10, 24)).toBe(24)
    expect(nextLimit(0, 50, 24)).toBe(24)
  })

  it('is a no-op once everything is revealed', () => {
    expect(nextLimit(24, 10, 24)).toBe(24)
  })

  it('clamps back down when the limit is past the total', () => {
    expect(nextLimit(30, 10, 3)).toBe(3)
  })

  it('handles an empty list and a zero step', () => {
    expect(nextLimit(0, 10, 0)).toBe(0)
    expect(nextLimit(10, 0, 24)).toBe(10)
  })
})
