/**
 * Verifies the published package actually contains everything it advertises.
 *
 * This package has no build step, so nothing else would catch a file left out
 * of `files`, an `exports` path pointing at a moved file, or a wildcard subpath
 * that resolves to an empty directory. Those failures are invisible locally
 * (where the repo is on disk) and only surface in whichever consumer upgrades
 * first — across four repos, that is an expensive place to find out.
 *
 * So: pack the real tarball, unpack it, and assert every export resolves.
 */

import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'

import { checkCssImports, checkExportsResolve } from './pack-smoke-helpers'

/**
 * The package under test is whichever one invoked the script, not the one this file
 * happens to live in.
 *
 * It used to resolve from `import.meta.url`, which meant @rxova/website-schemas running
 * `../brand/scripts/pack-smoke.ts` packed @rxova/brand and reported a confident
 * green for a tarball it had never looked at. pnpm sets cwd to the package running
 * the script, so cwd is the honest answer.
 */
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
