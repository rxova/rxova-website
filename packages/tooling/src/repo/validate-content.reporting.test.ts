/** The content gate's report: every problem in one pass, the counts, and the CLI around them. */

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { validateContent, countContent, runCli, defaultContentRoot } from './validate-content.ts'
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
    expect(errors.every((e) => e.startsWith('apps/'))).toBe(true)
  })
})

describe('countContent', () => {
  it('counts the markdown in each directory', () => {
    expect(countContent(content(valid))).toEqual({ posts: 1, updates: 1, authors: 1 })
  })

  it('ignores non-markdown, and missing directories count as zero', () => {
    const root = emptyRoot()
    mkdirSync(join(root, 'apps/blog/posts'), { recursive: true })
    writeFileSync(join(root, 'apps/blog/posts', 'notes.txt'), 'stray')
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
