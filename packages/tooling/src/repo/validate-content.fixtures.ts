/**
 * On-disk fixtures for the validate-content suites (not a mocked `fs`: the script reads
 * directories, resolves relative cover paths and stats files).
 */

import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const roots: string[] = []

/** Removes every root made since the last call; each suite runs it `afterEach`. */
export function removeContentRoots(): void {
  for (const dir of roots.splice(0)) rmSync(dir, { recursive: true, force: true })
}

/** An empty temp directory, removed by `removeContentRoots`. */
export function emptyRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'rxova-content-'))
  roots.push(root)
  return root
}

export interface Fixture {
  posts?: Record<string, string>
  updates?: Record<string, string>
  authors?: Record<string, string>
  /** Extra directories to create, relative to the content root. */
  dirs?: string[]
  /** Extra files to drop in, keyed by path relative to the content root. */
  files?: Record<string, string>
}

/**
 * A repo root holding both surfaces, with `authors` duplicated into each package as
 * in the real layout.
 */
export function content(fixture: Fixture): string {
  const root = emptyRoot()

  const layout = [
    ['apps/blog/posts', fixture.posts],
    ['apps/blog/authors', fixture.authors],
    ['apps/updates/updates', fixture.updates],
    ['apps/updates/authors', fixture.authors],
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

export const AUTHOR = `---
name: Rxova
---
`

export const post = (over: Record<string, string> = {}, body = 'Body.') => {
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

export const update = (over: Record<string, string> = {}) => {
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

export const valid: Fixture = {
  authors: { 'rxova.md': AUTHOR },
  posts: { '2026-07-27T143005-a-post.md': post() },
  updates: { '2026-07-27T090000-an-update.md': update() },
}
