/**
 * Packs the real tarball, unpacks it, and asserts every export (and CSS `@import`) resolves.
 * Catches files missing from `files` or stale `exports` paths before a consumer does.
 */

import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'

import { checkCssImports, checkExportsResolve } from './pack-smoke-helpers'

/** The package under test is the one that invoked the script (pnpm sets cwd), not this file's. */
const repoRoot = process.cwd()
interface Manifest {
  readonly exports?: Readonly<Record<string, unknown>>
}

const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8')) as Manifest
const exportMap = pkg.exports ?? {}

const workDir = mkdtempSync(join(tmpdir(), 'rxova-brand-exports-'))
const failures: string[] = []

try {
  const tarball = execFileSync('pnpm', ['pack', '--pack-destination', workDir], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
    .trim()
    .split('\n')
    .pop()

  execFileSync('tar', ['-xzf', tarball, '-C', workDir])
  const packed = join(workDir, 'package')

  failures.push(...checkExportsResolve(exportMap, packed))
  failures.push(...checkCssImports(exportMap, packed))
} finally {
  rmSync(workDir, { recursive: true, force: true })
}

if (failures.length > 0) {
  console.error('Package contract violations:\n')
  for (const failure of failures) console.error(`  ✗ ${failure}`)
  process.exit(1)
}

console.log(`✓ all ${String(Object.keys(exportMap).length)} exports resolve in the packed tarball`)
