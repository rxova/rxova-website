import { mkdtempSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { createServer as createTcpServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { fetchOk, freePort, gallerySlugs, readGallerySlugs, shotFile, waitFor } from './gallery.ts'

describe('gallerySlugs', () => {
  it('keeps the mdx pages but the index, as sorted slugs', () => {
    expect(gallerySlugs(['value-grid.mdx', 'index.mdx', 'cta-band.mdx', 'notes.md'])).toEqual([
      'cta-band',
      'value-grid',
    ])
  })

  it('reads a directory', () => {
    const dir = mkdtempSync(join(tmpdir(), 'gallery-'))
    for (const file of ['section.mdx', 'index.mdx', '.DS_Store']) writeFileSync(join(dir, file), '')
    expect(readGallerySlugs(dir)).toEqual(['section'])
  })
})

describe('shotFile', () => {
  it('suffixes the dark scheme only', () => {
    expect(shotFile('/out', 'section', 'light')).toBe(resolve('/out/section.png'))
    expect(shotFile('/out', 'section', 'dark')).toBe(resolve('/out/section-dark.png'))
  })
})

describe('waitFor', () => {
  it('returns once the probe says the URL is up', async () => {
    let calls = 0
    const probe = async () => ++calls >= 3
    await expect(waitFor('http://x/', { probe, delayMs: 1 })).resolves.toBeUndefined()
    expect(calls).toBe(3)
  })

  it('throws after the attempts run out', async () => {
    const probe = async () => false
    await expect(waitFor('http://x/', { probe, attempts: 2, delayMs: 1 })).rejects.toThrow(
      'http://x/ did not come up after 2 attempts',
    )
  })
})

describe('fetchOk', () => {
  it('is true for a 2xx, false for a 404 and false for a closed port', async () => {
    const server = createServer((request, response) => {
      response.statusCode = request.url === '/up/' ? 200 : 404
      response.end()
    })
    const port = await freePort()
    await new Promise<void>((r) => server.listen(port, '127.0.0.1', r))
    try {
      expect(await fetchOk(`http://127.0.0.1:${port}/up/`)).toBe(true)
      expect(await fetchOk(`http://127.0.0.1:${port}/down/`)).toBe(false)
      // The default probe is fetchOk, so waitFor resolves at once against the live server.
      await expect(
        waitFor(`http://127.0.0.1:${port}/up/`, { attempts: 1 }),
      ).resolves.toBeUndefined()
    } finally {
      await new Promise((r) => server.close(r))
    }
    expect(await fetchOk(`http://127.0.0.1:${port}/up/`)).toBe(false)
  })
})

describe('freePort', () => {
  it('returns a port that can be bound', async () => {
    const port = await freePort()
    expect(port).toBeGreaterThan(0)
    const server = createTcpServer()
    await new Promise<void>((r) => server.listen(port, '127.0.0.1', r))
    await new Promise((r) => server.close(r))
  })
})
