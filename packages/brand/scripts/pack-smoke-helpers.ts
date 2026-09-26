import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

/** The testable half of pack-smoke: each check takes the unpacked directory as an argument. */

/** Filesystem probes, injectable so tests need no real tarball. */
export interface Fs {
  readonly exists: (path: string) => boolean
  readonly readDir: (path: string) => readonly string[]
  readonly readFile: (path: string) => string
}

export const nodeFs: Fs = {
  exists: existsSync,
  readDir: readdirSync,
  readFile: (path) => readFileSync(path, 'utf8'),
}

/**
 * Every declared export must resolve inside the packed tree.
 * A wildcard subpath passes when its directory exists and is non-empty.
 */
export const checkExportsResolve = (
  exports: Readonly<Record<string, unknown>>,
  packed: string,
  fs: Fs = nodeFs,
): string[] => {
  const failures: string[] = []

  for (const [subpath, target] of Object.entries(exports)) {
    if (typeof target !== 'string') {
      failures.push(`${subpath}: conditional exports are not handled by this check`)
      continue
    }

    if (subpath.includes('*')) {
      const dir = join(packed, dirname(target))
      if (!fs.exists(dir) || fs.readDir(dir).length === 0) {
        failures.push(`${subpath} -> ${target}: directory missing or empty in the tarball`)
      }
      continue
    }

    if (!fs.exists(join(packed, target))) {
      failures.push(`${subpath} -> ${target}: missing from the tarball`)
    }
  }

  return failures
}

/**
 * Every CSS entry point is imported by consumers, so a dangling relative
 * `@import` inside one fails at their build time rather than ours.
 */
export const checkCssImports = (
  exports: Readonly<Record<string, unknown>>,
  packed: string,
  fs: Fs = nodeFs,
): string[] => {
  const failures: string[] = []

  for (const [subpath, target] of Object.entries(exports)) {
    if (typeof target !== 'string' || !target.endsWith('.css')) continue
    if (subpath.includes('*') || !fs.exists(join(packed, target))) continue

    const css = fs.readFile(join(packed, target))
    for (const match of css.matchAll(/@import\s+['"](\.[^'"]+)['"]/g)) {
      const specifier = match[1]
      if (specifier === undefined) continue
      if (!fs.exists(join(packed, dirname(target), specifier))) {
        failures.push(`${subpath}: @import '${specifier}' does not resolve in the tarball`)
      }
    }
  }

  return failures
}
