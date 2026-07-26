// These run against real directories rather than a mocked fs, because the bug
// they exist to prevent was a filesystem fact: use-everywhere moved to Astro,
// `apps/docs/build` stopped existing, and the deploy died at upload. Anything
// that stubs `statSync` would have happily passed with the old code too.

import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'

import { resolveOutput, outputFor } from './resolve-output.mjs'
import { loadRegistry, DEFAULT_OUTPUT_CANDIDATES } from './registry.mjs'

const CLI = join(import.meta.dirname, 'resolve-output.mjs')

let root
before(() => {
  root = mkdtempSync(join(tmpdir(), 'rxova-output-'))
})
after(() => {
  rmSync(root, { recursive: true, force: true })
})

/**
 * Lay out a fake project checkout. `dirs` maps a relative path to its contents:
 * a list of filenames, or `[]` for a directory that exists but is empty.
 */
function checkout(name, dirs) {
  const workdir = join(root, name)
  for (const [dir, files] of Object.entries(dirs)) {
    mkdirSync(join(workdir, dir), { recursive: true })
    for (const file of files) writeFileSync(join(workdir, dir, file), 'x')
  }
  mkdirSync(workdir, { recursive: true })
  return workdir
}

describe('resolveOutput', () => {
  it('finds an Astro/Starlight build', () => {
    const workdir = checkout('astro', { 'apps/docs/dist': ['index.html'] })
    const { dir, candidate, hasIndex } = resolveOutput(DEFAULT_OUTPUT_CANDIDATES, workdir)
    assert.equal(dir, join(workdir, 'apps/docs/dist'))
    assert.equal(candidate, 'apps/docs/dist')
    assert.equal(hasIndex, true)
  })

  it('falls back to a Docusaurus build', () => {
    const workdir = checkout('docusaurus', { 'apps/docs/build': ['index.html'] })
    const { dir, checked } = resolveOutput(DEFAULT_OUTPUT_CANDIDATES, workdir)
    assert.equal(dir, join(workdir, 'apps/docs/build'))
    assert.deepEqual(checked, ['apps/docs/dist'], 'should report what it skipped')
  })

  it('prefers dist when a stale build/ is left over from before the migration', () => {
    // The exact shape of a half-migrated checkout: both directories present.
    // Uploading the Docusaurus leftovers would deploy the old docs silently.
    const workdir = checkout('both', {
      'apps/docs/dist': ['index.html'],
      'apps/docs/build': ['index.html'],
    })
    assert.equal(
      resolveOutput(DEFAULT_OUTPUT_CANDIDATES, workdir).dir,
      join(workdir, 'apps/docs/dist'),
    )
  })

  it('skips a directory that exists but is empty', () => {
    // A framework can create its output directory and then fail before writing
    // to it; uploading that would publish an empty docs section.
    const workdir = checkout('empty-dist', {
      'apps/docs/dist': [],
      'apps/docs/build': ['index.html'],
    })
    assert.equal(
      resolveOutput(DEFAULT_OUTPUT_CANDIDATES, workdir).dir,
      join(workdir, 'apps/docs/build'),
    )
  })

  it('skips a candidate that is a file rather than a directory', () => {
    const workdir = checkout('file-dist', { 'apps/docs': [] })
    writeFileSync(join(workdir, 'apps/docs/dist'), 'not a directory')
    mkdirSync(join(workdir, 'apps/docs/build'), { recursive: true })
    writeFileSync(join(workdir, 'apps/docs/build/index.html'), 'x')
    assert.equal(
      resolveOutput(DEFAULT_OUTPUT_CANDIDATES, workdir).dir,
      join(workdir, 'apps/docs/build'),
    )
  })

  it('reports nothing found, and everything it tried', () => {
    const workdir = checkout('nothing', { 'apps/docs': ['astro.config.mjs'] })
    const { dir, checked } = resolveOutput(DEFAULT_OUTPUT_CANDIDATES, workdir)
    assert.equal(dir, null)
    assert.deepEqual(checked, DEFAULT_OUTPUT_CANDIDATES)
  })

  it('flags output with no index.html — the shape of a wrong base URL', () => {
    const workdir = checkout('no-index', { 'apps/docs/dist': ['404.html'] })
    const { dir, hasIndex } = resolveOutput(DEFAULT_OUTPUT_CANDIDATES, workdir)
    assert.ok(dir, 'still resolves — the warning is advisory, not fatal')
    assert.equal(hasIndex, false)
  })

  it('honours a custom candidate list from sources.json', () => {
    const workdir = checkout('custom', { 'website/out': ['index.html'] })
    assert.equal(resolveOutput(['website/out'], workdir).dir, join(workdir, 'website/out'))
  })

  it('survives a workdir that does not exist at all', () => {
    assert.equal(
      resolveOutput(DEFAULT_OUTPUT_CANDIDATES, join(root, 'never-checked-out')).dir,
      null,
    )
  })
})

describe('outputFor', () => {
  const registry = loadRegistry()

  it('uses the project entry from the registry', () => {
    const id = registry.sources[0].id
    const workdir = checkout(`registry-${id}`, { 'apps/docs/dist': ['index.html'] })
    const { source, dir } = outputFor(id, workdir, registry)
    assert.equal(source.id, id)
    assert.equal(dir, join(workdir, 'apps/docs/dist'))
  })

  it('names the known projects when asked for one that is not there', () => {
    assert.throws(() => outputFor('typo', root, registry), /unknown project "typo"/)
  })

  it('resolves a project that is in the registry but disabled', () => {
    // Disabled projects are not in the matrix, so this never runs for one in CI
    // — but the lookup should not depend on `enabled`, which is a build-time gate.
    const registry2 = { sources: [{ id: 'off', enabled: false, output: ['out'] }] }
    const workdir = checkout('disabled', { out: ['index.html'] })
    assert.equal(outputFor('off', workdir, registry2).dir, join(workdir, 'out'))
  })
})

describe('the CLI', () => {
  const id = loadRegistry().sources[0].id

  function run(args, env = {}) {
    try {
      const stdout = execFileSync('node', [CLI, ...args], {
        encoding: 'utf8',
        env: { ...process.env, GITHUB_OUTPUT: '', ...env },
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      return { code: 0, stdout, stderr: '' }
    } catch (err) {
      return { code: err.status, stdout: err.stdout ?? '', stderr: err.stderr ?? '' }
    }
  }

  it('writes dir= to $GITHUB_OUTPUT on success', () => {
    const workdir = checkout('cli-ok', { 'apps/docs/dist': ['index.html'] })
    const outFile = join(root, 'gh-output-ok')
    writeFileSync(outFile, '')
    const { code, stdout } = run([id, workdir], { GITHUB_OUTPUT: outFile })
    assert.equal(code, 0, stdout)

    assert.equal(readFileSync(outFile, 'utf8').trim(), `dir=${join(workdir, 'apps/docs/dist')}`)
  })

  it('warns, but succeeds, when the output has no index.html', () => {
    const workdir = checkout('cli-no-index', { 'apps/docs/dist': ['404.html'] })
    const { code, stdout } = run([id, workdir])
    assert.equal(code, 0)
    assert.match(stdout, /::warning::/)
    assert.match(stdout, /may 404/)
  })

  it('exits 1 with a diagnosis when the build produced nothing', () => {
    const workdir = checkout('cli-empty', { 'apps/docs': ['astro.config.mjs'] })
    const { code, stderr } = run([id, workdir])
    assert.equal(code, 1)
    assert.match(stderr, /::error::/)
    assert.match(stderr, /apps\/docs\/dist/, 'says which candidates it tried')
    assert.match(stderr, /apps\/docs\/build/)
    assert.match(stderr, /astro\.config\.mjs/, 'shows what is actually there')
    assert.match(stderr, /sources\.json/, 'names the knob to turn')
  })

  it('exits 1 on an unknown project rather than uploading nothing', () => {
    const { code, stderr } = run(['not-a-project', root])
    assert.equal(code, 1)
    assert.match(stderr, /unknown project/)
  })

  it('exits 1 with usage when called with no project', () => {
    const { code, stderr } = run([])
    assert.equal(code, 1)
    assert.match(stderr, /usage/)
  })
})
