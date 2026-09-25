/**
 * The pre-merge gate for `content/`.
 *
 * Fixtures on disk rather than mocked `fs`: the script reads directories, resolves
 * relative cover paths and stats files, and a mock of all that would be asserting
 * against my model of the filesystem instead of the filesystem.
 *
 * What matters most here is the *failure* behaviour. This gate is the only thing
 * standing between a malformed entry and a broken deploy in another repo, and its
 * contract is that it reports everything in one pass — a validator that stops at
 * the first error turns "five posts have the wrong date" into five round trips.
 */

import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  validateContent,
  countContent,
  runCli,
  defaultContentRoot,
  bodyImages,
} from './validate-content.ts'

const roots: string[] = []

afterEach(() => {
  for (const dir of roots.splice(0)) rmSync(dir, { recursive: true, force: true })
})

interface Fixture {
  posts?: Record<string, string>
  updates?: Record<string, string>
  authors?: Record<string, string>
  /** Extra directories to create, relative to the content root. */
  dirs?: string[]
  /** Extra files to drop in, keyed by path relative to the content root. */
  files?: Record<string, string>
}

/**
 * A repo root holding both surfaces.
 *
 * `authors` is written into each package, because that is how they actually live:
 * self-contained, with the registry duplicated rather than shared. A fixture that
 * put them in one place would be testing a layout that does not exist.
 */
function content(fixture: Fixture): string {
  const root = mkdtempSync(join(tmpdir(), 'rxova-content-'))
  roots.push(root)

  const layout = [
    ['packages/blog/posts', fixture.posts],
    ['packages/blog/authors', fixture.authors],
    ['packages/updates/updates', fixture.updates],
    ['packages/updates/authors', fixture.authors],
  ] as const

  for (const [dir, files] of layout) {
    mkdirSync(join(root, dir), { recursive: true })
    for (const [name, body] of Object.entries(files ?? {})) {
      writeFileSync(join(root, dir, name), body)
    }
  }
  for (const dir of fixture.dirs ?? []) mkdirSync(join(root, dir), { recursive: true })
  for (const [rel, body] of Object.entries(fixture.files ?? {})) {
    writeFileSync(join(root, rel), body)
  }
  return root
}

const AUTHOR = `---
name: Rxova
---
`

const post = (over: Record<string, string> = {}, body = 'Body.') => {
  const fields = {
    title: 'A post',
    description: 'A description.',
    pubDate: '2026-07-27T14:30:05Z',
    authors: '[rxova]',
    ...over,
  }
  return `---\n${Object.entries(fields)
    .filter(([, v]) => v !== '')
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')}\n---\n\n${body}\n`
}

const update = (over: Record<string, string> = {}) => {
  const fields = {
    title: 'An update',
    date: '2026-07-27T09:00:00Z',
    repos: '[brand]',
    authors: '[rxova]',
    ...over,
  }
  return `---\n${Object.entries(fields)
    .filter(([, v]) => v !== '')
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')}\n---\n\nBody.\n`
}

const valid: Fixture = {
  authors: { 'rxova.md': AUTHOR },
  posts: { '2026-07-27T143005-a-post.md': post() },
  updates: { '2026-07-27T090000-an-update.md': update() },
}

describe('a valid tree', () => {
  it('reports nothing', () => {
    expect(validateContent(content(valid))).toEqual([])
  })

  it('tolerates directories that do not exist yet', () => {
    const root = mkdtempSync(join(tmpdir(), 'rxova-content-'))
    roots.push(root)
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
      content({ ...valid, files: { 'packages/blog/posts/notes.txt': 'stray' } }),
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

describe('cover', () => {
  it('passes when it resolves into content/images', () => {
    expect(
      validateContent(
        content({
          ...valid,
          posts: { '2026-07-27T143005-a-post.md': post({ cover: '../images/a-post/hero.png' }) },
          dirs: ['packages/blog/images/a-post'],
          files: { 'packages/blog/images/a-post/hero.png': 'not really a png' },
        }),
      ),
    ).toEqual([])
  })

  // posts/ holds markdown and nothing else, so an image dropped beside a post is
  // caught rather than silently ignored. Covers live under content/images.
  it('does not let an image sit in posts/', () => {
    const errors = validateContent(
      content({ ...valid, files: { 'packages/blog/posts/hero.png': 'not really a png' } }),
    )
    expect(errors).toEqual(['packages/blog/posts/hero.png: only .md files belong here'])
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
          dirs: ['packages/blog/images/a-post'],
          files: { 'packages/blog/images/a-post/hero.png': 'not really a png' },
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
          dirs: ['packages/blog/images/a-post'],
          files: { 'packages/blog/images/a-post/hero.png': 'not really a png' },
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
      'packages/blog/posts/2026-07-27T143005-a-post.md: ' +
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
          dirs: ['packages/blog/images/a-post'],
          files: { 'packages/blog/images/a-post/diagram.png': 'not really a png' },
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
    expect(errors[0]).toContain('packages/updates/updates/2026-07-27T090000-an-update.md')
  })

  it('reports every broken embed, not just the first', () => {
    const errors = validateContent(
      content(withBody('![one](./a.png)\n\n![two](./b.png)\n\n![three](./c.png)')),
    )
    expect(errors).toHaveLength(3)
  })
})

// A post about markdown quotes markdown. Scanning the raw source would make the
// syntax unwritable — the reason this is a unit test and not another fixture is
// that the interesting cases are all about what must NOT be treated as an embed.
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
   * The same fixture the render suite builds, read off disk.
   *
   * Hand-written strings are where the edge cases live, but they are also where a
   * test can quietly drift from the file format it claims to describe. This reads
   * the real post — frontmatter, fences, inline code and all — and pins the answer
   * against the images that post genuinely embeds. If the two suites ever disagree
   * about what that file means, one of them is wrong and this is where it shows.
   */
  it('agrees with the render fixture about what it embeds', () => {
    const fixture = join(
      defaultContentRoot(),
      'packages/blog/test/fixtures/posts/2026-01-01T000000-cover-described.md',
    )
    const source = readFileSync(fixture, 'utf8')
    const body = source.slice(source.indexOf('\n---', 3))

    // Twice: once described, once decorative. The remote URL, the fenced sample and
    // the inline-code sample are all absent, and the fenced one names a file that
    // does not exist — so a miss here is a broken build, not a cosmetic diff.
    expect(bodyImages(body)).toEqual([
      '../images/cover-described/diagram.png',
      '../images/cover-described/diagram.png',
    ])
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
      'packages/blog/posts/2026-07-27T143005-a-post.md: updatedDate is earlier than pubDate',
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

// The contract that makes this gate usable: one run surfaces everything, so a
// contributor fixes their entry once instead of five times.
describe('reporting', () => {
  it('collects every problem across every file in one pass', () => {
    const errors = validateContent(
      content({
        authors: { 'rxova.md': AUTHOR },
        posts: {
          '2026-07-27T143000-one.md': post({ pubDate: '2026-07-27T14:30:05Z' }),
          '2026-07-27T143005-two.md': post({ authors: '[nobody]', cover: './missing.png' }),
        },
        updates: { '2026-07-27T090000-three.md': update({ repos: '[not-a-repo]' }) },
      }),
    )
    expect(errors.length).toBeGreaterThanOrEqual(4)
    for (const name of ['one.md', 'two.md', 'three.md']) {
      expect(errors.some((e) => e.includes(name))).toBe(true)
    }
  })

  it('prefixes every error with the path relative to the repo root', () => {
    const errors = validateContent(
      content({ ...valid, posts: { '2026-07-27T143005-a-post.md': post({ title: "''" }) } }),
    )
    expect(errors.every((e) => e.startsWith('packages/'))).toBe(true)
  })
})

describe('countContent', () => {
  it('counts the markdown in each directory', () => {
    expect(countContent(content(valid))).toEqual({ posts: 1, updates: 1, authors: 1 })
  })

  it('ignores non-markdown, and missing directories count as zero', () => {
    const root = mkdtempSync(join(tmpdir(), 'rxova-content-'))
    roots.push(root)
    mkdirSync(join(root, 'packages/blog/posts'), { recursive: true })
    writeFileSync(join(root, 'packages/blog/posts', 'notes.txt'), 'stray')
    expect(countContent(root)).toEqual({ posts: 0, updates: 0, authors: 0 })
  })
})

describe('runCli', () => {
  const capture = () => {
    const log: string[] = []
    const error: string[] = []
    return {
      log: (m: string) => log.push(m),
      error: (m: string) => error.push(m),
      log_: log,
      err_: error,
    }
  }

  it('returns 0 and reports the counts when the tree is clean', () => {
    const out = capture()
    expect(runCli(content(valid), out)).toBe(0)
    expect(out.log_.join('\n')).toContain('content ok — 1 post(s), 1 update(s), 1 author(s)')
    expect(out.err_).toEqual([])
  })

  it('returns 1, lists every problem and points at the docs', () => {
    const out = capture()
    const code = runCli(
      content({
        ...valid,
        posts: { '2026-07-27T143005-a-post.md': post({ authors: '[nobody]' }) },
      }),
      out,
    )
    expect(code).toBe(1)
    const text = out.err_.join('\n')
    expect(text).toContain('content validation failed — 1 problem(s)')
    expect(text).toContain('no such author "nobody"')
    expect(text).toContain('docs/CONTENT.md')
    expect(out.log_).toEqual([])
  })

  it("defaults to this repo's own content, which must be valid", () => {
    const out = capture()
    expect(runCli(defaultContentRoot(), out)).toBe(0)
  })
})
