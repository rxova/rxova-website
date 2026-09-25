import { describe, expect, it } from 'vitest'

import { checkCssImports, checkExportsResolve, type Fs } from './pack-smoke-helpers'

/**
 * A fake filesystem standing in for an unpacked tarball, so every branch is
 * reachable without running `pnpm pack`. Directories are inferred from the file
 * paths, which is enough for the wildcard check.
 */
const fakeFs = (files: Readonly<Record<string, string>>): Fs => {
  const paths = Object.keys(files)
  const dirs = new Set(
    paths.flatMap((path) => {
      const parts = path.split('/')
      return parts.slice(0, -1).map((_, index) => parts.slice(0, index + 1).join('/'))
    }),
  )

  return {
    exists: (path) => path in files || dirs.has(path),
    readDir: (path) =>
      paths
        .filter((file) => file.startsWith(`${path}/`))
        .map((file) => file.slice(path.length + 1).split('/')[0] ?? ''),
    readFile: (path) => files[path] ?? '',
  }
}

describe('checkExportsResolve', () => {
  it('passes when every declared export is present', () => {
    const fs = fakeFs({ 'pkg/src/index.ts': '', 'pkg/src/tokens.css': '' })

    expect(
      checkExportsResolve({ '.': './src/index.ts', './tokens.css': './src/tokens.css' }, 'pkg', fs),
    ).toEqual([])
  })

  it('reports an export whose target is not in the tarball', () => {
    const fs = fakeFs({ 'pkg/src/index.ts': '' })

    expect(checkExportsResolve({ './gone': './src/gone.ts' }, 'pkg', fs)).toEqual([
      './gone -> ./src/gone.ts: missing from the tarball',
    ])
  })

  it('accepts a wildcard whose directory has contents', () => {
    const fs = fakeFs({ 'pkg/components/Hero.astro': '' })

    expect(checkExportsResolve({ './components/*': './components/*' }, 'pkg', fs)).toEqual([])
  })

  it('rejects a wildcard whose directory is missing or empty', () => {
    // The real failure mode when a `files` entry drops a whole folder.
    const fs = fakeFs({ 'pkg/src/index.ts': '' })

    expect(checkExportsResolve({ './components/*': './components/*' }, 'pkg', fs)).toEqual([
      './components/* -> ./components/*: directory missing or empty in the tarball',
    ])
  })

  it('flags a conditional export rather than silently passing it', () => {
    const fs = fakeFs({})

    expect(checkExportsResolve({ '.': { import: './src/index.ts' } }, 'pkg', fs)).toEqual([
      '.: conditional exports are not handled by this check',
    ])
  })

  it('reports every failure, not just the first', () => {
    const fs = fakeFs({})

    expect(checkExportsResolve({ './a': './a.ts', './b': './b.ts' }, 'pkg', fs)).toHaveLength(2)
  })

  it('passes an empty export map', () => {
    expect(checkExportsResolve({}, 'pkg', fakeFs({}))).toEqual([])
  })
})

describe('checkCssImports', () => {
  it('passes when a relative @import resolves', () => {
    const fs = fakeFs({
      'pkg/src/theme.css': "@import './tokens.css';\n",
      'pkg/src/tokens.css': '',
    })

    expect(checkCssImports({ './theme.css': './src/theme.css' }, 'pkg', fs)).toEqual([])
  })

  it('reports a dangling relative @import', () => {
    const fs = fakeFs({ 'pkg/src/theme.css': "@import './missing.css';\n" })

    expect(checkCssImports({ './theme.css': './src/theme.css' }, 'pkg', fs)).toEqual([
      "./theme.css: @import './missing.css' does not resolve in the tarball",
    ])
  })

  it('ignores bare package @imports, which are the consumer resolver’s problem', () => {
    const fs = fakeFs({ 'pkg/src/theme.css': "@import 'normalize.css';\n" })

    expect(checkCssImports({ './theme.css': './src/theme.css' }, 'pkg', fs)).toEqual([])
  })

  it('skips non-CSS exports entirely', () => {
    const fs = fakeFs({ 'pkg/src/index.ts': "@import './nope.css'" })

    expect(checkCssImports({ '.': './src/index.ts' }, 'pkg', fs)).toEqual([])
  })

  it('reports every dangling import in one file', () => {
    const fs = fakeFs({
      'pkg/src/theme.css': "@import './a.css';\n@import './b.css';\n",
    })

    expect(checkCssImports({ './theme.css': './src/theme.css' }, 'pkg', fs)).toHaveLength(2)
  })
})
