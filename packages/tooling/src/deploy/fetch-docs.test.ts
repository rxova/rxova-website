// fetch-docs turns the registry into a download plan at deploy time. The gh and
// tar calls are the workflow's business; what is worth pinning is the mapping —
// only enabled projects are fetched, and each lands where assemble.ts will read
// it (artifacts/<artifact>), from the release the ingest side persisted it to.

import { afterEach, describe, it } from 'vitest'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { fetchDocs, fetchPlan, runFetchDocs, type FetchSource } from './fetch-docs.ts'
import { loadRegistry } from '../lib/registry.ts'

const registry: { sources: FetchSource[] } = {
  sources: [
    {
      id: 'journey',
      enabled: true,
      artifact: 'docs-journey',
      releaseTag: 'content-journey',
      releaseAsset: 'docs-journey.tgz',
    },
    {
      id: 'off',
      enabled: false,
      artifact: 'docs-off',
      releaseTag: 'content-off',
      releaseAsset: 'docs-off.tgz',
    },
  ],
}

describe('fetchPlan', () => {
  it('plans a download for every enabled project and skips disabled ones', () => {
    assert.deepEqual(fetchPlan(registry), [
      {
        id: 'journey',
        tag: 'content-journey',
        asset: 'docs-journey.tgz',
        dest: 'docs-journey',
      },
    ])
  })

  it('extracts into artifacts/<artifact>, exactly where assemble.ts reads it', () => {
    const [plan] = fetchPlan(registry)
    assert.equal(plan?.dest, registry.sources[0]?.artifact)
  })

  it('returns nothing for a landing-only registry', () => {
    assert.deepEqual(fetchPlan({ sources: [] }), [])
  })

  it('agrees with the real sources.json (tag/asset/dest all derive from id)', () => {
    for (const plan of fetchPlan(loadRegistry())) {
      assert.equal(plan.tag, `content-${plan.id}`)
      assert.equal(plan.asset, `docs-${plan.id}.tgz`)
      assert.equal(plan.dest, `docs-${plan.id}`)
    }
  })
})

// gh and tar are replaced by a recorder; the directories are real temp dirs.
const roots: string[] = []
afterEach(() => {
  for (const dir of roots.splice(0)) rmSync(dir, { recursive: true, force: true })
})

/** Records each gh/tar call and queues the temp dir gh was pointed at for removal. */
const recorder = (fail?: unknown) => {
  const calls: string[][] = []
  const exec = (file: string, args: string[]) => {
    calls.push([file, ...args])
    if (file === 'gh') {
      roots.push(args[args.indexOf('--dir') + 1] ?? '')
      if (fail !== undefined) throw fail
    }
  }
  return { calls, exec }
}

const tempDir = () => {
  const dir = mkdtempSync(join(tmpdir(), 'rxova-fetch-docs-'))
  roots.push(dir)
  return dir
}

const quiet = () => {}

describe('fetchDocs', () => {
  it('downloads and extracts each enabled project into artifacts/<artifact>', () => {
    const artifacts = join(tempDir(), 'artifacts')
    const { calls, exec } = recorder()
    const log: string[] = []

    fetchDocs([artifacts], { registry: () => registry, exec, log: (m) => log.push(m) })

    const tmp = roots.at(-1) ?? ''
    const dest = join(artifacts, 'docs-journey')
    assert.deepEqual(calls, [
      [
        'gh',
        'release',
        'download',
        'content-journey',
        '--pattern',
        'docs-journey.tgz',
        '--dir',
        tmp,
      ],
      ['tar', '-xzf', join(tmp, 'docs-journey.tgz'), '-C', dest],
    ])
    assert.ok(existsSync(dest))
    assert.deepEqual(log, [
      `Fetching persisted docs -> ${artifacts}`,
      `  ✓ journey: content-journey / docs-journey.tgz -> ${dest}`,
      'Done.',
    ])
  })

  it('fetches nothing for a landing-only registry', () => {
    const { calls, exec } = recorder()
    const log: string[] = []

    fetchDocs([], { registry: () => ({ sources: [] }), exec, log: (m) => log.push(m) })

    assert.deepEqual(calls, [])
    assert.deepEqual(log, ['No enabled projects; landing-only deploy, nothing to fetch.'])
  })

  it('names the missing release, with gh’s own explanation, when a download fails', () => {
    const failure = Object.assign(new Error('exit 1'), { stderr: Buffer.from(' 404 \n') })
    const { exec } = recorder(failure)

    assert.throws(
      () => fetchDocs([tempDir()], { registry: () => registry, exec, log: quiet }),
      (err: Error) => {
        assert.equal(
          err.message,
          'no persisted docs for "journey" (release content-journey / docs-journey.tgz).\n' +
            'Either it was never ingested, or it should be disabled in sources.json.\n' +
            '404',
        )
        assert.equal(err.cause, failure)
        return true
      },
    )
  })

  it('falls back to the error message when gh wrote nothing to stderr', () => {
    const { exec } = recorder(new Error('spawn gh ENOENT'))

    assert.throws(
      () => fetchDocs([tempDir()], { registry: () => registry, exec, log: quiet }),
      /disabled in sources\.json\.\nspawn gh ENOENT$/,
    )
  })

  it('reads the real sources.json by default', () => {
    const { calls, exec } = recorder()

    fetchDocs([tempDir()], { exec, log: quiet })

    assert.deepEqual(
      calls.filter(([file]) => file === 'gh').map((call) => call[3]),
      fetchPlan(loadRegistry()).map((plan) => plan.tag),
    )
  })
})

describe('runFetchDocs', () => {
  it('returns 0 when every fetch succeeds', () => {
    assert.equal(runFetchDocs([], { registry: () => ({ sources: [] }), log: quiet }), 0)
  })

  it('prints the failure and returns 1', () => {
    const errors: string[] = []
    const registry = () => {
      throw new Error('sources.json: could not be read or parsed')
    }

    assert.equal(
      runFetchDocs([], { registry }, (m) => errors.push(m)),
      1,
    )
    assert.deepEqual(errors, ['ERROR: sources.json: could not be read or parsed'])
  })
})
