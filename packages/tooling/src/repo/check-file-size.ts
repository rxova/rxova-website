/** Fails when a tracked source file grows past the line limit. Usage: `pnpm check:size`. */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export const MAX_LINES = 500

const CHECKED = /\.(ts|tsx|js|mjs|cjs|astro|css|ya?ml|json)$/
const IGNORED = new Set(['pnpm-lock.yaml'])

/** Files over the limit today, each removed as it is split. Shrinks only. */
export const ALLOWED: ReadonlySet<string> = new Set([
  'apps/landing/src/components/Walkthrough.astro',
])

export interface SourceFile {
  path: string
  lines: number
}

export const isChecked = (path: string): boolean =>
  CHECKED.test(path) && !IGNORED.has(path.slice(path.lastIndexOf('/') + 1))

/** Problems with `files`: any over the limit, and any allowlisted one that no longer needs it. */
export function sizeProblems(
  files: readonly SourceFile[],
  max = MAX_LINES,
  allowed: ReadonlySet<string> = ALLOWED,
): string[] {
  const problems: string[] = []
  for (const { path, lines } of files) {
    if (lines > max && !allowed.has(path)) problems.push(`${path}: ${lines} lines (limit ${max})`)
    if (lines <= max && allowed.has(path)) {
      problems.push(`${path}: ${lines} lines, now within the limit; remove it from ALLOWED`)
    }
  }
  return problems
}

export const countLines = (text: string): number =>
  text === '' ? 0 : text.split('\n').length - (text.endsWith('\n') ? 1 : 0)

/* v8 ignore start -- the entry point; the rules above are what the tests cover */
if (import.meta.main) {
  const root = resolve(import.meta.dirname, '../../../..')
  const tracked = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' })
  const files = tracked
    .split('\n')
    .filter(isChecked)
    .map((path) => ({ path, lines: countLines(readFileSync(resolve(root, path), 'utf8')) }))
  const problems = sizeProblems(files)
  for (const problem of problems) console.error(`✗ ${problem}`)
  if (problems.length === 0) console.log(`✓ ${files.length} files within ${MAX_LINES} lines`)
  process.exitCode = problems.length === 0 ? 0 : 1
}
/* v8 ignore stop */
