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

/** A repo root whose apps/landing/ has a stand-in @rxova/brand installed, exporting its assets. */
function repoWithBrand(cards: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'rxova-sync-og-'))
  roots.push(root)
  const brand = join(root, 'apps', 'landing', 'node_modules', '@rxova', 'brand')
  mkdirSync(join(brand, 'assets', 'og'), { recursive: true })
  writeFileSync(join(root, 'apps', 'landing', 'package.json'), '{"name":"@rxova/landing"}\n')
  writeFileSync(
    join(brand, 'package.json'),
    JSON.stringify({ name: '@rxova/brand', exports: { './assets/*': './assets/*' } }),
  )
  for (const [name, body] of Object.entries(cards))
    writeFileSync(join(brand, 'assets/og', name), body)
  return root
}

describe('syncBrandOg', () => {
  it('copies every card from the installed package into apps/landing/public/og', () => {
    const root = repoWithBrand({ 'rxova.png': 'apex', 'journey.png': 'journey' })
    const log: string[] = []

    syncBrandOg(root, (m) => log.push(m))

    const target = join(root, 'apps/landing/public/og')
    expect(readdirSync(target).sort()).toEqual(['journey.png', 'rxova.png'])
    expect(readFileSync(join(target, 'journey.png'), 'utf8')).toBe('journey')
    expect(log).toEqual(['✓ synced social cards from @rxova/brand into apps/landing/public/og'])
  })

  it('overwrites a stale copy, so the cards follow the installed version', () => {
    const root = repoWithBrand({ 'rxova.png': 'new' })
    mkdirSync(join(root, 'apps/landing/public/og'), { recursive: true })
    writeFileSync(join(root, 'apps/landing/public/og/rxova.png'), 'old')
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})

    syncBrandOg(root)

    expect(readFileSync(join(root, 'apps/landing/public/og/rxova.png'), 'utf8')).toBe('new')
    expect(log).toHaveBeenCalledOnce()
  })
})
