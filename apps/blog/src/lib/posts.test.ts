/**
 * This package's real `posts/` and `authors/`, checked against the contract inside the package.
 * The repo-level validator is the pre-merge gate; this lets `pnpm --filter @rxova/blog test` fail alone.
 */

import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'
import { parse as parseYaml } from 'yaml'

import { postBase, authorBase, parseEntryFilename } from '@rxova/website-schemas'

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

const read = (dir: string) =>
  readdirSync(join(packageRoot, dir))
    .filter((n) => n.endsWith('.md'))
    .map((name) => ({
      name,
      frontmatter: parseYaml(
        readFileSync(join(packageRoot, dir, name), 'utf8')
          .split('\n---')[0]!
          .replace(/^---/, ''),
      ) as Record<string, unknown>,
    }))

const posts = read('posts')
const authors = read('authors')

describe('the blog exposes articles', () => {
  // The point of the package. A build that renders nothing is a surface that
  // mounts an empty page, which the aggregator would happily publish.
  it('has at least one post', () => {
    expect(posts.length).toBeGreaterThanOrEqual(1)
  })

  it('has at least one author to attribute them to', () => {
    expect(authors.length).toBeGreaterThanOrEqual(1)
  })
})

describe('every post', () => {
  it.each(posts.map((p) => [p.name, p] as const))('%s parses against postBase', (_name, post) => {
    const parsed = postBase.safeParse(post.frontmatter)
    expect(parsed.error?.issues ?? []).toEqual([])
    expect(parsed.success).toBe(true)
  })

  it.each(posts.map((p) => [p.name, p] as const))('%s has a resolvable byline', (_name, post) => {
    const ids = authors.map((a) => a.name.replace(/\.md$/, ''))
    for (const id of post.frontmatter.authors as string[]) {
      expect(ids).toContain(id)
    }
  })

  // The prefix exists so the directory sorts the way the site does; if it and the
  // frontmatter disagree, it is sorting by something that is not true.
  it.each(posts.map((p) => [p.name, p] as const))(
    '%s has a filename matching its pubDate',
    (name, post) => {
      const parsed = parseEntryFilename(name)
      expect(parsed).not.toBeNull()
      expect(parsed!.iso).toBe(new Date(post.frontmatter.pubDate as string).toISOString())
    },
  )

  it('gives every post a unique slug, since the slug is the URL', () => {
    const slugs = posts.map((p) => parseEntryFilename(p.name)!.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })
})

describe('every author', () => {
  it.each(authors.map((a) => [a.name, a] as const))(
    '%s parses against authorBase',
    (_name, author) => {
      expect(authorBase.safeParse(author.frontmatter).success).toBe(true)
    },
  )
})
