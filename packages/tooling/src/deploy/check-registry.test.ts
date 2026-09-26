import { afterEach, describe, expect, it, vi } from 'vitest'

import { checkRegistry } from './check-registry.ts'
import { resolveSource } from '../lib/registry.ts'

const source = (id: string, enabled: boolean) =>
  resolveSource({ id, enabled, landing: { blurb: 'b', tags: ['t'] } })

const capture = () => {
  const out: string[] = []
  const err: string[] = []
  return { out, err, log: (m: string) => out.push(m), error: (m: string) => err.push(m) }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('checkRegistry', () => {
  it('lists every project, marking the enabled ones, and exits 0', () => {
    const io = capture()
    const load = () => ({ sources: [source('journey', true), source('later', false)] })

    expect(checkRegistry({ ...io, load })).toBe(0)
    expect(io.out).toEqual([
      'sources.json OK — 2 project(s), 1 enabled:',
      '  ✓ journey          rxova/journey -> /packages/journey/',
      '  – later            rxova/later -> /packages/later/',
    ])
    expect(io.err).toEqual([])
  })

  it('notes a landing-only deploy when nothing is enabled', () => {
    const io = capture()
    expect(checkRegistry({ ...io, load: () => ({ sources: [source('later', false)] }) })).toBe(0)
    expect(io.out.at(-1)).toBe(
      '\nNote: no projects are enabled; the site will deploy as landing-only.',
    )
  })

  it('reports a registry that fails to load and exits 1', () => {
    const io = capture()
    const load = () => {
      throw new Error('sources.json: duplicate id "foo"')
    }

    expect(checkRegistry({ ...io, load })).toBe(1)
    expect(io.out).toEqual([])
    expect(io.err).toEqual(['ERROR: sources.json: duplicate id "foo"'])
  })

  it('reads the real sources.json and prints to the console by default', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})

    expect(checkRegistry()).toBe(0)
    expect(log.mock.calls[0]?.[0]).toMatch(/^sources\.json OK — \d+ project\(s\), \d+ enabled:$/)
  })
})
