import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { syncBrandOg } from './sync-brand-og.ts'

const roots: string[] = []
afterEach(() => {
  for (const dir of roots.splice(0)) rmSync(dir, { recursive: true, force: true })
  vi.restoreAllMocks()
})

/** A repo root whose site/ has a stand-in @rxova/brand installed, exporting its assets. */
function repoWithBrand(cards: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'rxova-sync-og-'))
  roots.push(root)
  const brand = join(root, 'site', 'node_modules', '@rxova', 'brand')
  mkdirSync(join(brand, 'assets', 'og'), { recursive: true })
  writeFileSync(join(root, 'site', 'package.json'), '{"name":"site"}\n')
  writeFileSync(
    join(brand, 'package.json'),
    JSON.stringify({ name: '@rxova/brand', exports: { './assets/*': './assets/*' } }),
  )
  for (const [name, body] of Object.entries(cards))
    writeFileSync(join(brand, 'assets/og', name), body)
  return root
}

describe('syncBrandOg', () => {
  it('copies every card from the installed package into site/public/og', () => {
    const root = repoWithBrand({ 'rxova.png': 'apex', 'journey.png': 'journey' })
    const log: string[] = []

    syncBrandOg(root, (m) => log.push(m))

    const target = join(root, 'site/public/og')
    expect(readdirSync(target).sort()).toEqual(['journey.png', 'rxova.png'])
    expect(readFileSync(join(target, 'journey.png'), 'utf8')).toBe('journey')
    expect(log).toEqual(['✓ synced social cards from @rxova/brand into site/public/og'])
  })

  it('overwrites a stale copy, so the cards follow the installed version', () => {
    const root = repoWithBrand({ 'rxova.png': 'new' })
    mkdirSync(join(root, 'site/public/og'), { recursive: true })
    writeFileSync(join(root, 'site/public/og/rxova.png'), 'old')
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})

    syncBrandOg(root)

    expect(readFileSync(join(root, 'site/public/og/rxova.png'), 'utf8')).toBe('new')
    expect(log).toHaveBeenCalledOnce()
  })
})
