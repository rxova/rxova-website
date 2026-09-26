import { describe, expect, it } from 'vitest'

import { ALLOWED, countLines, isChecked, MAX_LINES, sizeProblems } from './check-file-size.ts'

describe('isChecked', () => {
  it.each(['a.ts', 'b.astro', 'c.css', 'd.mjs', '.github/workflows/ci.yml', 'turbo.json'])(
    'checks %s',
    (path) => expect(isChecked(path)).toBe(true),
  )

  it.each(['pnpm-lock.yaml', 'README.md', 'posts/a.md', 'logo.png'])('skips %s', (path) =>
    expect(isChecked(path)).toBe(false),
  )
})

describe('countLines', () => {
  it.each([
    ['', 0],
    ['one', 1],
    ['one\n', 1],
    ['one\ntwo\n', 2],
    ['one\ntwo', 2],
  ])('counts %j as %i lines', (text, lines) => expect(countLines(text)).toBe(lines))
})

describe('sizeProblems', () => {
  it('passes files within the limit', () => {
    expect(sizeProblems([{ path: 'a.ts', lines: MAX_LINES }])).toEqual([])
  })

  it('fails a file over the limit', () => {
    expect(sizeProblems([{ path: 'a.ts', lines: 501 }], 500, new Set())).toEqual([
      'a.ts: 501 lines (limit 500)',
    ])
  })

  it('lets an allowlisted file stay over the limit', () => {
    expect(sizeProblems([{ path: 'big.ts', lines: 900 }], 500, new Set(['big.ts']))).toEqual([])
  })

  it('fails an allowlisted file that no longer needs it, so the list only shrinks', () => {
    expect(sizeProblems([{ path: 'big.ts', lines: 40 }], 500, new Set(['big.ts']))).toEqual([
      'big.ts: 40 lines, now within the limit; remove it from ALLOWED',
    ])
  })

  it('allows only files that exist in the repo layout', () => {
    for (const path of ALLOWED) expect(isChecked(path)).toBe(true)
  })
})
