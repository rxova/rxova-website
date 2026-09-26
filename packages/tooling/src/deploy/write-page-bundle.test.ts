import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { PAGE_BUNDLE_FILENAME } from '@rxova/website-schemas'

import { writePageBundle } from './write-page-bundle.ts'

const roots: string[] = []
afterEach(() => {
  for (const dir of roots.splice(0)) rmSync(dir, { recursive: true, force: true })
  vi.restoreAllMocks()
})

const tempDist = () => {
  const dir = mkdtempSync(join(tmpdir(), 'rxova-page-bundle-'))
  roots.push(dir)
  return dir
}

describe('writePageBundle', () => {
  it('writes the manifest the aggregator reads, pretty-printed with a trailing newline', async () => {
    const dist = tempDist()
    const log: string[] = []

    await writePageBundle([dist, 'blog', '/blog/'], (m) => log.push(m))

    const path = join(dist, PAGE_BUNDLE_FILENAME)
    expect(readFileSync(path, 'utf8')).toBe(
      '{\n  "schema": 2,\n  "format": "html-page-component",\n  "project": "blog",\n  "base": "/blog/"\n}\n',
    )
    expect(log).toEqual([`Wrote ${path}`])
  })

  it('logs to the console by default', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const dist = tempDist()

    await writePageBundle([dist, 'updates', '/updates/'])

    expect(log).toHaveBeenCalledWith(`Wrote ${join(dist, PAGE_BUNDLE_FILENAME)}`)
  })

  it.each([[[]], [['dist']], [['dist', 'blog']], [['', 'blog', '/blog/']]])(
    'refuses %j with the usage line',
    async (argv) => {
      await expect(writePageBundle(argv, () => {})).rejects.toThrow(
        'usage: write-page-bundle.ts <dist> <project> <base>',
      )
    },
  )

  it('fails when the dist directory does not exist', async () => {
    await expect(
      writePageBundle([join(tempDist(), 'missing'), 'blog', '/blog/'], () => {}),
    ).rejects.toThrow(/ENOENT/)
  })
})
