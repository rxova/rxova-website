import { describe, expect, it } from 'vitest'

import {
  countText,
  facets,
  filtersUrl,
  isFiltered,
  matches,
  place,
  progressText,
  readFilters,
  type Filters,
} from './stream'

const filters = (repo: string[] = [], tag: string[] = []): Filters => ({
  repo: new Set(repo),
  tag: new Set(tag),
})

describe('facets', () => {
  it('splits the data attributes, tolerating absent ones', () => {
    expect(facets('journey brand', 'fix')).toEqual({ repos: ['journey', 'brand'], tags: ['fix'] })
    expect(facets(undefined, '')).toEqual({ repos: [], tags: [] })
  })
})

describe('readFilters', () => {
  it('reads comma-separated repos and tags', () => {
    expect(readFilters('?repo=journey,brand&tag=fix')).toEqual(
      filters(['journey', 'brand'], ['fix']),
    )
  })

  it('is empty without a querystring', () => {
    expect(readFilters('')).toEqual(filters())
  })
})

describe('filtersUrl', () => {
  it('writes the filters and keeps the path and the fragment', () => {
    expect(filtersUrl('/updates/', filters(['journey'], ['fix', 'docs']), '#an-entry')).toBe(
      '/updates/?repo=journey&tag=fix%2Cdocs#an-entry',
    )
  })

  it('drops the querystring when nothing is filtered', () => {
    expect(filtersUrl('/updates/', filters(), '')).toBe('/updates/')
  })

  it('round-trips through readFilters', () => {
    const f = filters(['a', 'b'], ['c'])
    expect(readFilters(filtersUrl('/', f, '').slice(1))).toEqual(f)
  })
})

describe('isFiltered', () => {
  it.each([
    [filters(), false],
    [filters(['a']), true],
    [filters([], ['b']), true],
  ])('%j is filtered: %s', (f, expected) => expect(isFiltered(f)).toBe(expected))
})

describe('matches', () => {
  const entry = facets('journey', 'fix docs')

  it('matches everything when unfiltered', () => {
    expect(matches(entry, filters())).toBe(true)
  })

  it('ORs within a facet', () => {
    expect(matches(entry, filters(['brand', 'journey']))).toBe(true)
    expect(matches(entry, filters(['brand']))).toBe(false)
  })

  it('ANDs across facets', () => {
    expect(matches(entry, filters(['journey'], ['fix']))).toBe(true)
    expect(matches(entry, filters(['journey'], ['release']))).toBe(false)
  })
})

describe('place', () => {
  const entries = [facets('a', ''), facets('b', ''), facets('a', ''), facets('a', '')]

  it('batches the matching entries and hides the rest', () => {
    const { placements, matching, shown } = place(entries, filters(['a']), 2)
    expect(placements).toEqual([
      { hidden: false, beyond: false },
      { hidden: true, beyond: false },
      { hidden: false, beyond: false },
      { hidden: false, beyond: true },
    ])
    expect({ matching, shown }).toEqual({ matching: 3, shown: 2 })
  })

  it('shows everything under a limit past the total', () => {
    const { placements, shown } = place(entries, filters(), 10)
    expect(placements.every((p) => !p.hidden && !p.beyond)).toBe(true)
    expect(shown).toBe(4)
  })
})

describe('countText', () => {
  it('counts matches only while filtered, with the right plural', () => {
    expect(countText(3, 12, true)).toBe('3 of 12 entries')
    expect(countText(1, 1, true)).toBe('1 of 1 entry')
    expect(countText(12, 12, false)).toBe('')
  })
})

describe('progressText', () => {
  it('reports progress only while something is batched away', () => {
    expect(progressText(8, 20)).toBe('Showing 8 of 20')
    expect(progressText(20, 20)).toBe('')
  })
})
