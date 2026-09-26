/**
 * This package's own prose, against the real contract.
 *
 * `entries.test.ts` covers the ordering and formatting in the abstract. This covers
 * the thing the package exists to do: hold updates that a build can actually render.
 *
 * It reads the real `posts/` and `authors/` directories rather than fixtures. The
 * repo-level validator (`packages/tooling/src/repo/validate-content.ts`) already checks both surfaces
 * together and is the pre-merge gate — this is the check that fails inside the
 * package, so `pnpm --filter @rxova/updates test` tells you your own package is broken
 * without running the whole repo.
 */

import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'
import { parse as parseYaml } from 'yaml'

import { updateBase, authorBase, parseEntryFilename, unknownRepos } from '@rxova/website-schemas'
import { REPO_IDS } from '@rxova/brand'

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

const updates = read('updates')
const authors = read('authors')

describe('updates exposes entries', () => {
  // The point of the package. A build that renders nothing is a surface that
  // mounts an empty page, which the aggregator would happily publish.
  it('has at least one update', () => {
    expect(updates.length).toBeGreaterThanOrEqual(1)
  })

  it('has at least one author to attribute them to', () => {
    expect(authors.length).toBeGreaterThanOrEqual(1)
  })
})

describe('every update', () => {
  it.each(updates.map((p) => [p.name, p] as const))(
    '%s parses against updateBase',
    (_name, entry) => {
      const parsed = updateBase.safeParse(entry.frontmatter)
      expect(parsed.error?.issues ?? []).toEqual([])
      expect(parsed.success).toBe(true)
    },
  )

  it.each(updates.map((p) => [p.name, p] as const))(
    '%s has a resolvable byline',
    (_name, entry) => {
      const ids = authors.map((a) => a.name.replace(/\.md$/, ''))
      for (const id of entry.frontmatter.authors as string[]) {
        expect(ids).toContain(id)
      }
    },
  )

  // The prefix exists so the directory sorts the way the site does; if it and the
  // frontmatter disagree, it is sorting by something that is not true.
  it.each(updates.map((p) => [p.name, p] as const))(
    '%s has a filename matching its date',
    (name, entry) => {
      const parsed = parseEntryFilename(name)
      expect(parsed).not.toBeNull()
      expect(parsed!.iso).toBe(new Date(entry.frontmatter.date as string).toISOString())
    },
  )

  // The registry check @rxova/website-schemas deliberately cannot do: it is published, and
  // reaching into the design system for REPO_IDS is what broke its entry point.
  it.each(updates.map((p) => [p.name, p] as const))('%s names only real repos', (_name, entry) => {
    expect(unknownRepos(entry.frontmatter.repos as string[], REPO_IDS)).toEqual([])
  })

  it('gives every entry a unique slug, since the slug is its anchor', () => {
    const slugs = updates.map((p) => parseEntryFilename(p.name)!.slug)
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
