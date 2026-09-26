import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  changesetFormatErrors,
  checkChangeset,
  extractFrontmatterPackageCount,
  getChangedFiles,
  getChangesetFiles,
  getLabels,
  isDocsOrConfigOnly,
  readText,
  runCommand,
  type ChangesetIo,
} from './check-changeset.ts'

/**
 * The gate's rules, in-process: git, gh and the file reads are stubbed. The
 * subprocess tests in check-changeset.test.ts pin the same behaviour end to end.
 */

const ONE_PACKAGE = '---\n"@rxova/brand": patch\n---\n\nchange\n'

const ENV = {
  BASE_SHA: 'base',
  HEAD_SHA: 'head',
  GITHUB_REPOSITORY: 'rxova/brand',
  PR_NUMBER: '7',
}

interface Shell {
  changed?: string[]
  current?: string[]
  labels?: string[] | Error
}

/** A fake shell: `changed` is the full diff, `current` the diff without deletions. */
const shell = ({ changed = [], current = changed, labels = [] }: Shell = {}) => {
  const calls: string[] = []
  const run = (cmd: string): string => {
    calls.push(cmd)
    if (cmd.startsWith('gh api')) {
      if (labels instanceof Error) throw labels
      return labels.join('\n')
    }
    return (cmd.includes('--diff-filter') ? current : changed).join('\n')
  }
  return { calls, run }
}

/** Runs the gate with captured output. */
const check = (io: ChangesetIo & { env?: NodeJS.ProcessEnv }) => {
  const out: string[] = []
  const warnings: string[] = []
  const errors: string[] = []
  const code = checkChangeset({
    readFile: () => ONE_PACKAGE,
    log: (m) => out.push(m),
    warn: (m) => warnings.push(m),
    error: (m) => errors.push(m),
    ...io,
    env: { ...ENV, ...io.env },
  })
  return { code, out, warnings, errors }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('getChangedFiles', () => {
  it('asks git for the diff, optionally filtered, and splits it into paths', () => {
    const { calls, run } = shell({ changed: ['a.ts', ' b.md '] })
    expect(getChangedFiles(run, 'x', 'y')).toEqual(['a.ts', 'b.md'])
    expect(getChangedFiles(run, 'x', 'y', 'ACMRTUXB')).toEqual(['a.ts', 'b.md'])
    expect(calls).toEqual([
      'git diff --name-only x y',
      'git diff --name-only --diff-filter=ACMRTUXB x y',
    ])
  })

  it('returns nothing for an empty diff', () => {
    expect(getChangedFiles(shell().run, 'x', 'y')).toEqual([])
  })
})

describe('getChangesetFiles', () => {
  it('keeps changeset markdown and drops the README and anything else', () => {
    expect(
      getChangesetFiles([
        '.changeset/a.md',
        '.changeset/README.md',
        '.changeset/config.json',
        'docs/b.md',
      ]),
    ).toEqual(['.changeset/a.md'])
  })
})

describe('extractFrontmatterPackageCount', () => {
  it.each([
    [ONE_PACKAGE, 1],
    ["---\n'@rxova/brand': minor # why\n---\n", 1],
    ['---\n"@rxova/brand": patch\n"@rxova/website-schemas": major\n---\n', 2],
    ['---\n"@rxova/brand": huge\n---\n', 0],
    ['no frontmatter at all', 0],
  ])('counts %j as %i package(s)', (markdown, count) => {
    expect(extractFrontmatterPackageCount(markdown)).toBe(count)
  })
})

describe('changesetFormatErrors', () => {
  it('reports each changeset that is unreadable or not exactly one package', () => {
    const files: Record<string, string> = { 'a.md': ONE_PACKAGE, 'b.md': '---\n---\n' }
    const readFile = (file: string) => {
      const text = files[file]
      if (text === undefined) throw new Error('ENOENT')
      return text
    }
    expect(changesetFormatErrors(['a.md', 'b.md', 'c.md'], readFile)).toEqual([
      '- b.md: expected exactly 1 package, found 0',
      '- c.md: could not be read',
    ])
  })

  it('reads from disk by default', () => {
    expect(changesetFormatErrors(['.changeset/does-not-exist-xyz.md'])).toEqual([
      '- .changeset/does-not-exist-xyz.md: could not be read',
    ])
  })
})

describe('isDocsOrConfigOnly', () => {
  it.each([
    ['.github/workflows/ci.yml'],
    ['packages/tooling/src/lock/cli.ts'],
    ['.gitignore'],
    ['eslint.config.js'],
    ['README.md'],
  ])('skips a diff of only %s', (file) => {
    expect(isDocsOrConfigOnly([file])).toBe(true)
  })

  it('does not skip a published package, even one of its markdown files', () => {
    expect(isDocsOrConfigOnly(['packages/brand/README.md'])).toBe(false)
    expect(isDocsOrConfigOnly(['README.md', 'packages/brand/src/index.ts'])).toBe(false)
  })

  it('does not skip an empty diff', () => {
    expect(isDocsOrConfigOnly([])).toBe(false)
  })
})

describe('getLabels', () => {
  it('asks the GitHub API for the PR labels', () => {
    const { calls, run } = shell({ labels: ['bug', 'skip-changeset'] })
    expect(getLabels(run, 'rxova/brand', '7', 't0k')).toEqual(['bug', 'skip-changeset'])
    expect(calls).toEqual([
      `gh api -H "Authorization: Bearer t0k" repos/rxova/brand/issues/7/labels --jq '.[].name'`,
    ])
  })

  it('returns nothing for a PR without labels', () => {
    expect(getLabels(shell().run, 'r', '1', 't')).toEqual([])
  })

  it('warns and carries on when the API call fails', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(getLabels(shell({ labels: new Error('503') }).run, 'r', '1', 't')).toEqual([])
    expect(warn).toHaveBeenCalledWith(
      'Warning: failed to fetch labels via GH API, proceeding without labels.',
    )
  })
})

describe('checkChangeset', () => {
  const brand = ['packages/brand/src/index.ts']

  it('passes a single-package changeset', () => {
    const result = check({ run: shell({ changed: [...brand, '.changeset/a.md'] }).run })
    expect(result).toMatchObject({ code: 0, out: ['Changeset found.'], errors: [] })
  })

  it('fails a changeset that names more than one package, listing each offender', () => {
    const readFile = () => '---\n"@rxova/brand": patch\n"@rxova/preview": patch\n---\n'
    const result = check({ run: shell({ changed: ['.changeset/a.md'] }).run, readFile })
    expect(result).toMatchObject({ code: 1, out: [] })
    expect(result.errors).toEqual([
      'Invalid changeset format. Use one changeset file per package.',
      '- .changeset/a.md: expected exactly 1 package, found 2',
    ])
  })

  it('fails a published-package change with no changeset', () => {
    const result = check({ run: shell({ changed: brand }).run })
    expect(result.code).toBe(1)
    expect(result.errors).toEqual([
      "No changeset found. Add one with 'pnpm exec changeset' or apply the 'skip-changeset' label.",
    ])
  })

  it('does not count a deleted changeset as one being present', () => {
    const run = shell({ changed: [...brand, '.changeset/a.md'], current: brand }).run
    expect(check({ run }).code).toBe(1)
  })

  it('skips a docs/CI/config-only diff', () => {
    const result = check({ run: shell({ changed: ['.github/workflows/ci.yml'] }).run })
    expect(result).toMatchObject({
      code: 0,
      out: ['Docs/CI/config-only changes detected; skipping changeset check.'],
    })
  })

  it('skips on [skip-changeset] in the PR title', () => {
    const env = { PR_TITLE: 'chore: tweak [skip-changeset]' }
    const result = check({ run: shell({ changed: brand }).run, env })
    expect(result).toMatchObject({
      code: 0,
      out: ['[skip-changeset] found in PR title; skipping changeset check.'],
    })
  })

  it('skips on the skip-changeset label, looked up only when there is a token', () => {
    const labelled = shell({ changed: brand, labels: ['skip-changeset'] })
    expect(check({ run: labelled.run })).toMatchObject({ code: 1 })
    expect(labelled.calls.some((cmd) => cmd.startsWith('gh api'))).toBe(false)

    const result = check({ run: labelled.run, env: { GH_TOKEN: 't' } })
    expect(result).toMatchObject({
      code: 0,
      out: ['skip-changeset label present; skipping changeset check.'],
    })
  })

  it('falls through to the other checks when the labels do not skip or cannot be read', () => {
    const other = check({
      run: shell({ changed: brand, labels: ['bug'] }).run,
      env: { GH_TOKEN: 't' },
    })
    expect(other.code).toBe(1)

    const down = shell({ changed: ['.changeset/a.md'], labels: new Error('503') })
    const result = check({ run: down.run, env: { GH_TOKEN: 't' } })
    expect(result).toMatchObject({ code: 0, out: ['Changeset found.'] })
    expect(result.warnings).toEqual([
      'Warning: failed to fetch labels via GH API, proceeding without labels.',
    ])
  })

  it.each(['BASE_SHA', 'HEAD_SHA', 'GITHUB_REPOSITORY', 'PR_NUMBER'])(
    'throws when %s is missing',
    (name) => {
      expect(() => check({ run: shell().run, env: { [name]: '' } })).toThrow(
        `Missing required env: ${name}`,
      )
    },
  )

  it('reads process.env and prints to the console by default', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.stubEnv('BASE_SHA', 'b')
    vi.stubEnv('HEAD_SHA', 'h')
    vi.stubEnv('GITHUB_REPOSITORY', 'rxova/brand')
    vi.stubEnv('PR_NUMBER', '1')
    vi.stubEnv('PR_TITLE', '[skip-changeset]')
    vi.stubEnv('GH_TOKEN', '')
    try {
      expect(checkChangeset({ run: shell().run })).toBe(0)
    } finally {
      vi.unstubAllEnvs()
    }
    expect(log).toHaveBeenCalledWith(
      '[skip-changeset] found in PR title; skipping changeset check.',
    )
  })
})

describe('the real side effects', () => {
  it('runCommand returns trimmed stdout', () => {
    expect(runCommand('echo "  padded  "')).toBe('padded')
  })

  it('readText reads a file as UTF-8', () => {
    expect(readText(new URL(import.meta.url).pathname)).toContain('the real side effects')
  })
})
