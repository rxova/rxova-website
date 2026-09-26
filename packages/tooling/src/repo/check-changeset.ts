import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

/**
 * PR gate: fails when a change to a published package lands without a
 * changeset. Escape hatches: the `skip-changeset` label, `[skip-changeset]`
 * in the PR title, or a diff that only touches docs/CI/config.
 *
 * Shared, near-verbatim, across the four rxova repos. Keep the differences to
 * the two constants below so the copies stay diffable — this is one of the
 * files earmarked for @rxova/repo-tooling. Its behaviour is pinned by
 * check-changeset.test.ts, which spawns it against a throwaway git repo, and
 * its rules by check-changeset.unit.test.ts, which calls them in-process.
 */

/** Directory prefixes of packages that are published to npm. */
export const publishedPackageDirs = ['packages/brand/', 'packages/website-schemas/']

/**
 * Files that never require a changeset when they are the whole diff.
 *
 * The directory alternatives carry a `/.*` suffix on purpose. An earlier
 * version wrote them as `^(docs\/|\.github\/|…)$`, where the `$` meant each
 * branch could only ever match the bare directory string — never a path
 * beneath it — so those prefixes were dead and files were only skipped when
 * they happened to carry one of the listed extensions.
 */
export const allowedPattern =
  /^((apps\/(?:landing|preview|e2e)|\.github|\.changeset|\.husky|packages\/tooling)\/.*|\.[\w-]*ignore|[\w.-]+\.config\.(js|mjs|cjs|ts)|.*\.(md|txt|yml|yaml|json))$/

/** What the check reads and prints through; the defaults are the real ones. */
export interface ChangesetIo {
  env?: NodeJS.ProcessEnv
  /** Runs a shell command and returns its trimmed stdout. */
  run?: (cmd: string) => string
  readFile?: (file: string) => string
  log?: (message: string) => void
  warn?: (message: string) => void
  error?: (message: string) => void
}

type Run = (cmd: string) => string

const getEnv = (env: NodeJS.ProcessEnv, name: string, required = true): string | undefined => {
  const value = env[name]
  if (!value && required) {
    throw new Error(`Missing required env: ${name}`)
  }
  return value
}

export const runCommand = (cmd: string): string => {
  return execSync(cmd, { encoding: 'utf8' }).trim()
}

export const readText = (file: string): string => readFileSync(file, 'utf8')

export const getChangedFiles = (
  run: Run,
  baseSha: string,
  headSha: string,
  diffFilter?: string,
): string[] => {
  const filterArg = diffFilter ? ` --diff-filter=${diffFilter}` : ''
  const output = run(`git diff --name-only${filterArg} ${baseSha} ${headSha}`)
  if (!output) return []
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

export const getChangesetFiles = (files: readonly string[]): string[] => {
  return files.filter(
    (file) =>
      file.startsWith('.changeset/') && file.endsWith('.md') && path.basename(file) !== 'README.md',
  )
}

export const extractFrontmatterPackageCount = (markdown: string): number => {
  const match = /^---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/.exec(markdown)
  if (!match) {
    return 0
  }

  const frontmatter = match[1] ?? ''
  const packageLines = frontmatter
    .split('\n')
    .map((line) => line.trim())
    // Both quote styles: `changeset add` writes double quotes, but Prettier
    // with singleQuote rewrites them, and a double-quote-only pattern then
    // counts zero packages and fails a perfectly valid changeset.
    .filter((line) => /^("[^"]+"|'[^']+')\s*:\s*(patch|minor|major)(?:\s+#.*)?$/.test(line))

  return packageLines.length
}

/** One line per changeset that is unreadable or does not name exactly one package. */
export const changesetFormatErrors = (
  files: readonly string[],
  readFile: (file: string) => string = readText,
): string[] => {
  const errors: string[] = []

  for (const file of files) {
    let content: string
    try {
      content = readFile(file)
    } catch {
      errors.push(`- ${file}: could not be read`)
      continue
    }

    const packageCount = extractFrontmatterPackageCount(content)
    if (packageCount !== 1) {
      errors.push(`- ${file}: expected exactly 1 package, found ${String(packageCount)}`)
    }
  }

  return errors
}

export const isDocsOrConfigOnly = (files: readonly string[]): boolean => {
  const touchesPackage = files.some((file) =>
    publishedPackageDirs.some((dir) => file.startsWith(dir)),
  )

  return files.length > 0 && files.every((file) => allowedPattern.test(file)) && !touchesPackage
}

export const getLabels = (
  run: Run,
  repo: string,
  prNumber: string,
  token: string,
  warn: (message: string) => void = console.warn,
): string[] => {
  try {
    const output = run(
      `gh api -H "Authorization: Bearer ${token}" repos/${repo}/issues/${prNumber}/labels --jq '.[].name'`,
    )
    if (!output) return []
    return output
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
  } catch {
    // Deliberately not fatal: a transient API blip should not block a PR. Note
    // that a *permissions* problem looks the same from here, so the changeset
    // job must grant `pull-requests: read` or the label hatch silently no-ops.
    warn('Warning: failed to fetch labels via GH API, proceeding without labels.')
    return []
  }
}

/** Runs the gate and returns the exit code; throws when required environment is missing. */
export const checkChangeset = ({
  env = process.env,
  run = runCommand,
  readFile = readText,
  log = console.log,
  warn = console.warn,
  error = console.error,
}: ChangesetIo = {}): number => {
  const baseSha = getEnv(env, 'BASE_SHA')
  const headSha = getEnv(env, 'HEAD_SHA')
  const repo = getEnv(env, 'GITHUB_REPOSITORY')
  const prNumber = getEnv(env, 'PR_NUMBER')
  const prTitle = getEnv(env, 'PR_TITLE', false) ?? ''
  const ghToken = getEnv(env, 'GH_TOKEN', false) ?? ''

  if (!baseSha || !headSha || !repo || !prNumber) {
    throw new Error('Missing required environment for changeset check.')
  }

  const files = getChangedFiles(run, baseSha, headSha)
  // A second diff excluding deletions: a PR that *removes* a changeset must not
  // count that removal as "a changeset is present".
  const currentFiles = getChangedFiles(run, baseSha, headSha, 'ACMRTUXB')
  const currentChangesetFiles = getChangesetFiles(currentFiles)

  if (ghToken) {
    const labels = getLabels(run, repo, prNumber, ghToken, warn)
    if (labels.includes('skip-changeset')) {
      log('skip-changeset label present; skipping changeset check.')
      return 0
    }
  }

  if (prTitle.includes('[skip-changeset]')) {
    log('[skip-changeset] found in PR title; skipping changeset check.')
    return 0
  }

  if (currentChangesetFiles.length > 0) {
    const errors = changesetFormatErrors(currentChangesetFiles, readFile)
    if (errors.length > 0) {
      error('Invalid changeset format. Use one changeset file per package.')
      error(errors.join('\n'))
      return 1
    }
    log('Changeset found.')
    return 0
  }

  if (isDocsOrConfigOnly(files)) {
    log('Docs/CI/config-only changes detected; skipping changeset check.')
    return 0
  }

  error(
    "No changeset found. Add one with 'pnpm exec changeset' or apply the 'skip-changeset' label.",
  )
  return 1
}

/* v8 ignore start -- entry point; CI runs it and check-changeset.test.ts spawns it */
if (import.meta.main) process.exitCode = checkChangeset()
/* v8 ignore stop */
