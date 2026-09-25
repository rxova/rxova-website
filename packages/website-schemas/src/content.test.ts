/**
 * What a post, an update and an author may say.
 */

import { describe, expect, it } from 'vitest'

import { postBase, updateBase, authorBase, unknownRepos } from './content.ts'

const post = {
  title: 'T',
  description: 'D',
  pubDate: '2026-07-27T14:30:05Z',
}

const update = {
  title: 'T',
  date: '2026-07-27T09:00:00Z',
  repos: ['brand'],
}

describe('postBase', () => {
  it('defaults tags and draft so a minimal post is valid', () => {
    const parsed = postBase.parse(post)
    expect(parsed.tags).toEqual([])
    expect(parsed.draft).toBe(false)
    expect(parsed.pubDate).toEqual(new Date('2026-07-27T14:30:05Z'))
  })

  it('coerces a bare date', () => {
    expect(postBase.parse({ ...post, pubDate: '2026-07-27' }).pubDate).toEqual(
      new Date('2026-07-27T00:00:00Z'),
    )
  })

  it.each([
    ['no title', { ...post, title: '' }],
    ['no description', { ...post, description: '' }],
    ['an unparseable date', { ...post, pubDate: 'not a date' }],
  ])('rejects %s', (_label, value) => {
    expect(postBase.safeParse(value).success).toBe(false)
  })

  it('accepts an optional updatedDate', () => {
    expect(postBase.parse({ ...post, updatedDate: '2026-07-28' }).updatedDate).toEqual(
      new Date('2026-07-28T00:00:00Z'),
    )
  })

  it('accepts an optional coverAlt', () => {
    expect(postBase.parse({ ...post, coverAlt: 'A falling line chart.' }).coverAlt).toBe(
      'A falling line chart.',
    )
  })

  // Absent means "decorative", which the renderer turns into `alt=""`. An empty
  // string would mean the same thing while looking like someone tried to describe
  // the image and stopped — so it is rejected rather than quietly accepted.
  it('rejects an empty coverAlt rather than reading it as decorative', () => {
    expect(postBase.safeParse({ ...post, coverAlt: '' }).success).toBe(false)
  })

  it('leaves coverAlt undefined when it is not given', () => {
    expect(postBase.parse(post).coverAlt).toBeUndefined()
  })
})

describe('updateBase', () => {
  it('defaults tags, links and draft', () => {
    const parsed = updateBase.parse(update)
    expect(parsed.tags).toEqual([])
    expect(parsed.links).toEqual([])
    expect(parsed.draft).toBe(false)
  })

  // A sketch: the same flag a post carries, so both surfaces hold work back the
  // same way. Defaulting to false is what every entry written before it meant.
  it('accepts draft, marking the entry a sketch', () => {
    expect(updateBase.parse({ ...update, draft: true }).draft).toBe(true)
    expect(updateBase.safeParse({ ...update, draft: 'yes' }).success).toBe(false)
  })

  // Non-empty because the updates page is a filterable stream: an entry about
  // nothing can never be filtered to, and only ever shows in the unfiltered view.
  it('requires at least one repo', () => {
    expect(updateBase.safeParse({ ...update, repos: [] }).success).toBe(false)
  })

  // The schema checks shape only. Whether an id is a *real* repo is checked by
  // `unknownRepos` against @rxova/brand's REPOS — this package is published and
  // must not reach into the design system to find out. See `repoId`.
  it('accepts any well-formed id, leaving the registry check to unknownRepos', () => {
    expect(updateBase.safeParse({ ...update, repos: ['not-a-repo'] }).success).toBe(true)
    expect(updateBase.safeParse({ ...update, repos: ['Not A Repo'] }).success).toBe(false)
  })

  it.each(['journey', 'react-inputs', 'use-everywhere', 'rxova-website', 'brand'])(
    'accepts the repo id %s',
    (id) => {
      expect(updateBase.safeParse({ ...update, repos: [id] }).success).toBe(true)
    },
  )

  it('rejects a tag outside the enum', () => {
    expect(updateBase.safeParse({ ...update, tags: ['releases'] }).success).toBe(false)
  })

  it('accepts every tag in the enum', () => {
    const tags = ['release', 'feature', 'fix', 'docs', 'infra', 'deprecation', 'breaking']
    expect(updateBase.safeParse({ ...update, tags }).success).toBe(true)
  })

  it('requires links to carry a label and a real url', () => {
    expect(
      updateBase.safeParse({ ...update, links: [{ label: 'R', href: 'not-a-url' }] }).success,
    ).toBe(false)
    expect(
      updateBase.safeParse({ ...update, links: [{ label: 'R', href: 'https://x.dev' }] }).success,
    ).toBe(true)
  })

  it('leaves version optional — an update owes no release link', () => {
    expect(updateBase.parse(update).version).toBeUndefined()
    expect(updateBase.parse({ ...update, version: 'x@1.0.0' }).version).toBe('x@1.0.0')
  })
})

describe('authorBase', () => {
  it('needs only a name', () => {
    expect(authorBase.parse({ name: 'Rxova' })).toEqual({ name: 'Rxova' })
  })

  it('rejects a url that is not one', () => {
    expect(authorBase.safeParse({ name: 'R', url: 'github.com/rxova' }).success).toBe(false)
  })

  it('accepts the optional fields', () => {
    const parsed = authorBase.parse({
      name: 'R',
      url: 'https://github.com/rxova',
      github: 'rxova',
      bio: 'One line.',
    })
    expect(parsed.github).toBe('rxova')
  })
})

describe('unknownRepos', () => {
  const known = ['journey', 'brand', 'rxova-website']

  it('is empty when every id is registered', () => {
    expect(unknownRepos(['journey', 'brand'], known)).toEqual([])
  })

  it('returns exactly the ids it did not recognise', () => {
    expect(unknownRepos(['journey', 'nope', 'also-nope'], known)).toEqual(['nope', 'also-nope'])
  })

  it('treats an empty registry as recognising nothing', () => {
    expect(unknownRepos(['journey'], [])).toEqual(['journey'])
  })
})
