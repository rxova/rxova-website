/**
 * The content gate on each entry: its filename, its frontmatter, and that the two
 * name the same instant.
 */

import { afterEach, describe, expect, it } from 'vitest'

import { validateContent } from './validate-content.ts'
import {
  AUTHOR,
  content,
  post,
  removeContentRoots,
  update,
  valid,
} from './validate-content.fixtures.ts'

afterEach(removeContentRoots)

describe('filenames', () => {
  it.each([
    ['a bare date', '2026-07-27-a-post.md'],
    ['a time without seconds', '2026-07-27T1430-a-post.md'],
    ['no prefix at all', 'a-post.md'],
  ])('rejects %s', (_label, name) => {
    const errors = validateContent(content({ ...valid, posts: { [name]: post() } }))
    expect(errors.some((e) => e.includes('YYYY-MM-DDTHHMMSS'))).toBe(true)
  })

  it('rejects a non-markdown file rather than ignoring it', () => {
    const errors = validateContent(
      content({ ...valid, files: { 'apps/blog/posts/notes.txt': 'stray' } }),
    )
    expect(errors.some((e) => e.includes('only .md files belong here'))).toBe(true)
  })

  it('catches two entries fighting over one slug', () => {
    const errors = validateContent(
      content({
        ...valid,
        posts: {
          '2026-07-27T143005-a-post.md': post(),
          '2026-07-28T143005-a-post.md': post({ pubDate: '2026-07-28T14:30:05Z' }),
        },
      }),
    )
    expect(errors.some((e) => e.includes('slug "a-post" is already used by'))).toBe(true)
  })

  it('allows the same slug in posts and in updates — they are different URLs', () => {
    expect(
      validateContent(
        content({
          authors: { 'rxova.md': AUTHOR },
          posts: { '2026-07-27T143005-same.md': post() },
          updates: { '2026-07-27T090000-same.md': update() },
        }),
      ),
    ).toEqual([])
  })
})

describe('the filename and the frontmatter must be the same instant', () => {
  it('reports the exact rename that fixes it', () => {
    const errors = validateContent(
      content({
        ...valid,
        posts: { '2026-07-27T143000-a-post.md': post({ pubDate: '2026-07-27T14:30:05Z' }) },
      }),
    )
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('filename says 2026-07-27T143000')
    expect(errors[0]).toContain('rename to 2026-07-27T143005-a-post.md')
  })

  it('catches a date that disagrees, not only a time', () => {
    const errors = validateContent(
      content({
        ...valid,
        posts: { '2026-07-27T143005-a-post.md': post({ pubDate: '2026-07-28T14:30:05Z' }) },
      }),
    )
    expect(errors[0]).toContain('rename to 2026-07-28T143005-a-post.md')
  })

  // The trap the docs warn about: a local offset near midnight is a different UTC
  // day, so the filename and the frontmatter stop agreeing.
  it('compares in UTC, so a local offset can fail its own filename', () => {
    const errors = validateContent(
      content({
        ...valid,
        posts: { '2026-07-27T233005-a-post.md': post({ pubDate: '2026-07-27T23:30:05-05:00' }) },
      }),
    )
    expect(errors[0]).toContain('rename to 2026-07-28T043005-a-post.md')
  })

  it('applies to updates as well as posts', () => {
    const errors = validateContent(
      content({
        ...valid,
        updates: { '2026-07-27T090000-an-update.md': update({ date: '2026-07-27T09:00:01Z' }) },
      }),
    )
    expect(errors[0]).toContain('rename to 2026-07-27T090001-an-update.md')
  })
})

describe('frontmatter', () => {
  it('rejects a file with no frontmatter block', () => {
    const errors = validateContent(
      content({ ...valid, posts: { '2026-07-27T143005-a-post.md': 'Just prose.\n' } }),
    )
    expect(errors[0]).toContain('must start with `---`')
  })

  it('rejects a block that is never closed', () => {
    const errors = validateContent(
      content({ ...valid, posts: { '2026-07-27T143005-a-post.md': '---\ntitle: X\n' } }),
    )
    expect(errors[0]).toContain('never closed')
  })

  it('reports the parser message when the YAML is malformed', () => {
    const errors = validateContent(
      content({ ...valid, posts: { '2026-07-27T143005-a-post.md': '---\ntitle: "x\n---\n' } }),
    )
    expect(errors[0]).toContain('not valid YAML')
  })

  it('treats an empty block as an object, so the field errors are the real ones', () => {
    const errors = validateContent(
      content({ ...valid, posts: { '2026-07-27T143005-a-post.md': '---\n---\n' } }),
    )
    expect(errors.some((e) => e.includes('title'))).toBe(true)
    expect(errors.some((e) => e.includes('not valid YAML'))).toBe(false)
  })

  // A zod issue with an empty path — the frontmatter parsed, but to a string
  // rather than an object, so no field can be named.
  it('labels a whole-document failure as (root)', () => {
    const errors = validateContent(
      content({ ...valid, posts: { '2026-07-27T143005-a-post.md': '---\njust a string\n---\n' } }),
    )
    expect(errors.some((e) => e.includes('(root)'))).toBe(true)
  })

  it('names the offending field for a schema failure', () => {
    const errors = validateContent(
      content({ ...valid, updates: { '2026-07-27T090000-an-update.md': update({ repos: '[]' }) } }),
    )
    expect(errors.some((e) => e.includes('repos'))).toBe(true)
  })
})

describe('updatedDate', () => {
  it('rejects one earlier than pubDate', () => {
    const errors = validateContent(
      content({
        ...valid,
        posts: { '2026-07-27T143005-a-post.md': post({ updatedDate: '2026-07-26' }) },
      }),
    )
    expect(errors).toEqual([
      'apps/blog/posts/2026-07-27T143005-a-post.md: updatedDate is earlier than pubDate',
    ])
  })

  it('accepts one later', () => {
    expect(
      validateContent(
        content({
          ...valid,
          posts: { '2026-07-27T143005-a-post.md': post({ updatedDate: '2026-07-28' }) },
        }),
      ),
    ).toEqual([])
  })
})
