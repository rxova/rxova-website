/**
 * The pre-merge gate for `content/`: a valid tree, and the author registries.
 *
 * What matters most here is the *failure* behaviour. This gate is the only thing
 * standing between a malformed entry and a broken deploy in another repo, and its
 * contract is that it reports everything in one pass — a validator that stops at
 * the first error turns "five posts have the wrong date" into five round trips.
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
    for (const pkg of ['packages/blog/authors', 'packages/updates/authors']) {
      mkdirSync(join(root, pkg), { recursive: true })
      writeFileSync(join(root, pkg, 'rxova.md'), AUTHOR)
    }
    expect(validateContent(root)).toEqual([])
  })
})

describe('authors', () => {
  // One per surface: each package carries its own registry, so each is separately
  // unusable without one.
  it('fails per surface when there are none at all', () => {
    const errors = validateContent(content({ authors: {} }))
    expect(errors).toHaveLength(2)
    expect(errors.some((e) => e.startsWith('packages/blog/authors:'))).toBe(true)
    expect(errors.some((e) => e.startsWith('packages/updates/authors:'))).toBe(true)
    expect(errors.every((e) => e.includes('no authors defined'))).toBe(true)
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
    expect(errors.some((e) => e.includes('packages/blog/authors/rxova.md: name'))).toBe(true)
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
