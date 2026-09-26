/** The content gate on images: covers, their alt text, and embeds in the body. */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { validateContent, defaultContentRoot, bodyImages } from './validate-content.ts'
import {
  content,
  post,
  removeContentRoots,
  update,
  valid,
  type Fixture,
} from './validate-content.fixtures.ts'

afterEach(removeContentRoots)

describe('cover', () => {
  it('passes when it resolves into content/images', () => {
    expect(
      validateContent(
        content({
          ...valid,
          posts: { '2026-07-27T143005-a-post.md': post({ cover: '../images/a-post/hero.png' }) },
          dirs: ['apps/blog/images/a-post'],
          files: { 'apps/blog/images/a-post/hero.png': 'not really a png' },
        }),
      ),
    ).toEqual([])
  })

  // posts/ holds markdown and nothing else, so an image dropped beside a post is
  // caught rather than silently ignored. Covers live under content/images.
  it('does not let an image sit in posts/', () => {
    const errors = validateContent(
      content({ ...valid, files: { 'apps/blog/posts/hero.png': 'not really a png' } }),
    )
    expect(errors).toEqual(['apps/blog/posts/hero.png: only .md files belong here'])
  })

  it('fails when it does not resolve, and says where it looked', () => {
    const errors = validateContent(
      content({
        ...valid,
        posts: { '2026-07-27T143005-a-post.md': post({ cover: './missing.png' }) },
      }),
    )
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('does not resolve')
    expect(errors[0]).toContain('missing.png')
  })
})

describe('coverAlt', () => {
  it('is accepted alongside a cover', () => {
    expect(
      validateContent(
        content({
          ...valid,
          posts: {
            '2026-07-27T143005-a-post.md': post({
              cover: '../images/a-post/hero.png',
              coverAlt: 'A bar chart of build times, falling.',
            }),
          },
          dirs: ['apps/blog/images/a-post'],
          files: { 'apps/blog/images/a-post/hero.png': 'not really a png' },
        }),
      ),
    ).toEqual([])
  })

  // Omitting it is a legitimate choice — a decorative cover wants `alt=""` — so the
  // absence is never an error, only the orphan is.
  it('is not required by a cover', () => {
    expect(
      validateContent(
        content({
          ...valid,
          posts: { '2026-07-27T143005-a-post.md': post({ cover: '../images/a-post/hero.png' }) },
          dirs: ['apps/blog/images/a-post'],
          files: { 'apps/blog/images/a-post/hero.png': 'not really a png' },
        }),
      ),
    ).toEqual([])
  })

  it('is rejected without one, since the renderer would never read it', () => {
    const errors = validateContent(
      content({
        ...valid,
        posts: { '2026-07-27T143005-a-post.md': post({ coverAlt: 'Describes nothing.' }) },
      }),
    )
    expect(errors).toEqual([
      'apps/blog/posts/2026-07-27T143005-a-post.md: ' +
        'coverAlt — set without a cover; add `cover:` or drop the alt text',
    ])
  })

  it('rejects an empty one rather than treating it as absent', () => {
    const errors = validateContent(
      content({
        ...valid,
        posts: { '2026-07-27T143005-a-post.md': post({ cover: './x.png', coverAlt: "''" }) },
      }),
    )
    expect(errors.some((e) => e.includes('coverAlt'))).toBe(true)
  })
})

describe('embedded images', () => {
  const withBody = (body: string): Fixture => ({
    ...valid,
    posts: { '2026-07-27T143005-a-post.md': post({}, body) },
  })

  it('passes when the file is there', () => {
    expect(
      validateContent(
        content({
          ...withBody('![A diagram](../images/a-post/diagram.png)'),
          dirs: ['apps/blog/images/a-post'],
          files: { 'apps/blog/images/a-post/diagram.png': 'not really a png' },
        }),
      ),
    ).toEqual([])
  })

  it('fails when it is not, and says where it looked', () => {
    const errors = validateContent(content(withBody('![A diagram](../images/a-post/gone.png)')))
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('image — "../images/a-post/gone.png" does not resolve')
  })

  it('checks update bodies too', () => {
    const errors = validateContent(
      content({
        ...valid,
        updates: { '2026-07-27T090000-an-update.md': update({}) + '\n![x](./gone.png)\n' },
      }),
    )
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('apps/updates/updates/2026-07-27T090000-an-update.md')
  })

  it('reports every broken embed, not just the first', () => {
    const errors = validateContent(
      content(withBody('![one](./a.png)\n\n![two](./b.png)\n\n![three](./c.png)')),
    )
    expect(errors).toHaveLength(3)
  })
})

// A post about markdown quotes markdown, so these cases pin what must NOT be
// treated as an embed.
describe('bodyImages', () => {
  it('finds relative embeds', () => {
    expect(bodyImages('![a](./x.png) and ![b](../images/y.jpg)')).toEqual([
      './x.png',
      '../images/y.jpg',
    ])
  })

  it('ignores remote, rooted and anchor targets, which have no local file', () => {
    const body = '![a](https://example.com/x.png) ![b](/blog/y.png) ![c](data:image/png;base64,AA)'
    expect(bodyImages(body)).toEqual([])
  })

  it('ignores fenced blocks, so a post can show the syntax', () => {
    expect(bodyImages('```md\n![a](./nope.png)\n```\n\n![b](./yes.png)')).toEqual(['./yes.png'])
  })

  it('ignores tilde fences and their info strings', () => {
    expect(bodyImages('~~~markdown\n![a](./nope.png)\n~~~\n')).toEqual([])
  })

  it('ignores inline code', () => {
    expect(bodyImages('Write `![alt](./nope.png)` to embed one.')).toEqual([])
  })

  it('reads a title off the target rather than into it', () => {
    expect(bodyImages('![a](./x.png "A title")')).toEqual(['./x.png'])
  })

  it('handles the angle-bracket form', () => {
    expect(bodyImages('![a](<./a file.png>)')).toEqual(['./a file.png'])
  })

  it('takes an empty alt, which is how a decorative embed is written', () => {
    expect(bodyImages('![](./x.png)')).toEqual(['./x.png'])
  })

  it('is not fooled by a plain link', () => {
    expect(bodyImages('[not an image](./x.png)')).toEqual([])
  })

  /**
   * Reads the render suite's real fixture post off disk, so this suite and that one
   * cannot disagree about what the file embeds.
   */
  it('agrees with the render fixture about what it embeds', () => {
    const fixture = join(
      defaultContentRoot(),
      'apps/blog/test/fixtures/posts/2026-01-01T000000-cover-described.md',
    )
    const source = readFileSync(fixture, 'utf8')
    const body = source.slice(source.indexOf('\n---', 3))

    // Twice: once described, once decorative. The remote URL and the fenced and
    // inline-code samples are absent (the fenced one names a nonexistent file).
    expect(bodyImages(body)).toEqual([
      '../images/cover-described/diagram.png',
      '../images/cover-described/diagram.png',
    ])
  })
})
