/**
 * The behaviour lock: builds a base ref and the working tree the same way, and diffs what they ship.
 *
 * Usage: `pnpm lock:diff [--base <ref>]` (default `main`) or `pnpm lock:snapshot [out]`.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { parseArgs } from 'node:util'

import { buildCheckout } from './build.ts'
import { snapshot } from './snapshot.ts'

const repoRoot = resolve(import.meta.dirname, '../../../..')
const lockDir = join(repoRoot, '.lock')
const scratch = join(tmpdir(), 'rxova-lock')

const git = (...args: string[]) =>
  execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim()

async function snapshotCheckout(checkout: string, work: string, out: string): Promise<void> {
  const { roots, packs } = await buildCheckout(checkout, work)
  await rm(out, { recursive: true, force: true })
  await snapshot(roots, out)
  await mkdir(join(out, 'packages'), { recursive: true })
  for (const [name, pack] of Object.entries(packs)) {
    await writeFile(
      join(out, 'packages', `${name.replace('/', '__')}.json`),
      `${JSON.stringify(pack, null, 2)}\n`,
    )
  }
}

/** Snapshots `ref` in a throwaway worktree, reusing the last snapshot of the same commit. */
async function snapshotRef(ref: string): Promise<string> {
  const sha = git('rev-parse', '--verify', `${ref}^{commit}`)
  const out = join(lockDir, 'base')
  const stamp = join(lockDir, 'base.ref')
  if (existsSync(stamp) && (await readFile(stamp, 'utf8')) === sha) return out

  const worktree = join(scratch, 'worktree')
  git('worktree', 'prune')
  if (existsSync(worktree)) git('worktree', 'remove', '--force', worktree)
  git('worktree', 'add', '--detach', worktree, sha)
  execFileSync('pnpm', ['install', '--frozen-lockfile', '--prefer-offline'], {
    cwd: worktree,
    stdio: 'inherit',
  })
  await snapshotCheckout(worktree, join(scratch, 'work-base'), out)
  await writeFile(stamp, sha)
  return out
}

async function main(): Promise<number> {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: { base: { type: 'string', default: 'main' } },
  })
  const [command, target] = positionals

  if (command === 'snapshot') {
    await snapshotCheckout(
      repoRoot,
      join(scratch, 'work-head'),
      resolve(target ?? join(lockDir, 'head')),
    )
    return 0
  }
  if (command !== 'diff') {
    console.error('usage: lock <diff [--base <ref>] | snapshot [out]>')
    return 2
  }

  const base = await snapshotRef(values.base)
  const head = join(lockDir, 'head')
  await snapshotCheckout(repoRoot, join(scratch, 'work-head'), head)

  const diff = ['diff', '--no-index', '--', base, head]
  const patch = spawnSync('git', diff, { cwd: repoRoot, encoding: 'utf8' }).stdout
  await writeFile(join(lockDir, 'diff.patch'), patch)
  if (patch === '') {
    console.log(`lock: no difference from ${values.base}.`)
    return 0
  }
  spawnSync('git', ['diff', '--no-index', '--stat', '--', base, head], {
    cwd: repoRoot,
    stdio: 'inherit',
  })
  console.log(`lock: differs from ${values.base}; full patch in .lock/diff.patch`)
  return 1
}

process.exitCode = await main()
