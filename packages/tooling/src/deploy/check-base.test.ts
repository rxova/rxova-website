import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import { assetPaths, checkBase } from './check-base.ts'

const dirs: string[] = []
const dist = (html?: string): string => {
  const dir = mkdtempSync(join(tmpdir(), 'check-base-'))
  dirs.push(dir)
  if (html !== undefined) writeFileSync(join(dir, 'index.html'), html)
  return dir
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('assetPaths', () => {
  it('collects href and src values under _astro/ only', () => {
    const html =
      '<link href="/blog/_astro/a.css"><script src="/blog/_astro/b.js"></script><a href="/about/">x</a>'
    expect(assetPaths(html)).toEqual(['/blog/_astro/a.css', '/blog/_astro/b.js'])
  })
})

describe('checkBase', () => {
  it('passes when every asset sits under the base', () => {
    const dir = dist('<link href="/blog/_astro/a.css"><script src="/blog/_astro/b.js"></script>')
    expect(checkBase([dir, '/blog/'])).toBe('base ok — 2 asset path(s) under /blog/_astro/')
  })

  it('fails an asset built for another base, listing at most five', () => {
    const links = Array.from({ length: 7 }, (_, i) => `<link href="/_astro/${i}.css">`).join('')
    const error = (() => {
      try {
        checkBase([dist(links), '/blog/'])
      } catch (e) {
        return (e as Error).message
      }
    })()
    expect(error).toMatch(
      /^ERROR: built for the wrong base\.\n {2}expected every asset under \/blog\/_astro\//,
    )
    expect(error?.match(/ {2}got /g)).toHaveLength(5)
    expect(error).toContain("see turbo.json's env for build.")
  })

  it('fails a dist that references no assets', () => {
    expect(() => checkBase([dist('<p>hi</p>'), '/blog/'])).toThrow(/references no _astro assets/)
  })

  it('fails a dist with no index.html', () => {
    expect(() => checkBase([dist(), '/blog/'])).toThrow(/^ERROR: no index.html in /)
  })

  it('fails without both arguments', () => {
    expect(() => checkBase(['dist'])).toThrow('usage: check-base.ts <dist> <expected-base>')
  })
})
