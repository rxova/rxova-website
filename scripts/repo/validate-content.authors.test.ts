/**
 * The pre-merge gate for `content/`: a valid tree and the author registries. Its contract
 * is to report every error in one pass rather than stop at the first.
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { validateContent } from './validate-content.ts'
import {
  AUTHOR,
  content,
  emptyRoot,
  post,
  removeContentRoots,
  update,
  valid,
} from './validate-content.fixtures.ts'

afterEach(removeContentRoots)

describe('a valid tree', () => {
  it('reports nothing', () => {
    expect(validateContent(content(valid))).toEqual([])
  })

  it('tolerates directories that do not exist yet', () => {
    const root = emptyRoot()
    const authors = 'apps/site/content/authors'
    mkdirSync(join(root, authors), { recursive: true })
    writeFileSync(join(root, authors, 'rxova.md'), AUTHOR)
    expect(validateContent(root)).toEqual([])
  })
})

describe('authors', () => {
  // Posts and updates share one registry, so an empty one is one problem, reported once.
  it('fails once when there are none at all', () => {
    const errors = validateContent(content({ authors: {} }))
    expect(errors).toEqual([
      'apps/site/content/authors: no authors defined — every entry needs a byline that resolves',
    ])
  })

  it('names the author that does not exist, and lists the ones that do', () => {
    const errors = validateContent(
      content({
        ...valid,
        posts: { '2026-07-27T143005-a-post.md': post({ authors: '[nobody]' }) },
      }),
    )
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('no such author "nobody"')
    expect(errors[0]).toContain('authors/nobody.md')
    expect(errors[0]).toContain('have: rxova')
  })

  it('rejects an author file whose frontmatter is wrong', () => {
    const errors = validateContent(
      content({ ...valid, authors: { 'rxova.md': '---\nname: 4\n---\n' } }),
    )
    expect(errors.some((e) => e.includes('apps/site/content/authors/rxova.md: name'))).toBe(true)
  })

  it('rejects an author filename that is not a bare id', () => {
    const errors = validateContent(
      content({ ...valid, authors: { 'rxova.md': AUTHOR, 'Rxova-Two.md': AUTHOR } }),
    )
    expect(errors.some((e) => e.includes('name must be `<id>.md`'))).toBe(true)
  })

  // With no authors at all the "(have: …)" hint has nothing to list, so it is
  // omitted rather than printed empty.
  it('omits the list of known authors when there are none', () => {
    const errors = validateContent(
      content({ authors: {}, posts: { '2026-07-27T143005-a-post.md': post() } }),
    )
    const missing = errors.find((e) => e.includes('no such author'))
    expect(missing).toContain('no such author "rxova"')
    expect(missing).not.toContain('have:')
  })

  it('requires an author on an update too, not only on a post', () => {
    const errors = validateContent(
      content({
        ...valid,
        updates: { '2026-07-27T090000-an-update.md': update({ authors: '' }) },
      }),
    )
    expect(errors.some((e) => e.includes('authors'))).toBe(true)
  })
})
