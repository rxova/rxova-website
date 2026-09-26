import { describe, expect, it } from 'vitest'

import { FEED_EXCERPT_CHARS, feedExcerpt } from './feed'

describe('feedExcerpt', () => {
  it('returns the opening prose whole when it fits', () => {
    expect(feedExcerpt('Short and complete.')).toBe('Short and complete.')
  })

  it('defaults to the feed budget', () => {
    const long = 'word '.repeat(80)
    expect(feedExcerpt(long)).toBe(feedExcerpt(long, FEED_EXCERPT_CHARS))
    expect(feedExcerpt(long).length).toBeLessThanOrEqual(FEED_EXCERPT_CHARS + 1)
  })

  // Unlike the blog's card, a feed has no "Read more", so the ellipsis is part of the text.
  it('marks a cut with an ellipsis', () => {
    expect(feedExcerpt('alpha bravo charlie delta', 14)).toBe('alpha bravo…')
    expect(feedExcerpt('one two three, four five', 15)).toBe('one two three…')
  })

  it('is empty for an entry with no prose', () => {
    expect(feedExcerpt('# Only a heading')).toBe('')
  })
})
