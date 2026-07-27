// What the site is allowed to build from.
//
// The rule these pin is "fail loudly": a missing release, or a tarball that is not
// the shape the build expects, must stop the deploy. The alternative — carrying on
// with whatever happens to be on disk — publishes a silently stale blog, and
// nothing about the rendered site would tell you it had stopped updating.

import { describe, it } from 'vitest'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'

import {
  fetchContent,
  missingPaths,
  REQUIRED_PATHS,
  CONTENT_RELEASE,
  CONTENT_ASSET,
} from './fetch-content.mjs'

const dirs = []
const workdir = () => {
  const d = mkdtempSync(join(tmpdir(), 'rxova-fetch-'))
  dirs.push(d)
  return d
}
const cleanup = () => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true })
}

/**
 * A `run` stub that lays down whichever paths a real tar would have produced.
 *
 * Entries with an extension become files, the rest directories — REQUIRED_PATHS
 * mixes both, and `content/posts` has to be a directory for the .md inside it.
 */
const runThatExtracts = (paths) => (cmd, args) => {
  if (cmd === 'gh') return ''
  if (cmd === 'tar') {
    const dest = args[args.indexOf('-C') + 1]
    for (const p of [...paths].sort()) {
      const full = join(dest, p)
      if (/\.[a-z]+$/.test(p)) {
        mkdirSync(dirname(full), { recursive: true })
        writeFileSync(full, '')
      } else {
        mkdirSync(full, { recursive: true })
      }
    }
  }
  return ''
}

const COMPLETE = [...REQUIRED_PATHS, 'content/posts/a.md', 'content/updates/b.md']

describe('missingPaths', () => {
  it('is empty when everything required is present', () => {
    assert.deepEqual(
      missingPaths('/anywhere', () => true),
      [],
    )
  })

  it('lists exactly what is absent', () => {
    const absent = join('/anywhere', 'packages/content-schema/src/index.ts')
    assert.deepEqual(
      missingPaths('/anywhere', (p) => p !== absent),
      ['packages/content-schema/src/index.ts'],
    )
  })

  // The schema is the one whose absence is worst to debug from the other end: it
  // surfaces as an unresolvable import inside Astro's content sync, which reads
  // like a bug in this repo rather than a bad artifact.
  it('requires the schema and the repo registry, not just the prose', () => {
    assert.ok(REQUIRED_PATHS.includes('packages/content-schema/src/index.ts'))
    assert.ok(REQUIRED_PATHS.includes('packages/brand/src/sites.ts'))
  })
})

describe('fetchContent', () => {
  it('downloads the release asset and unpacks it into dest', async () => {
    const dest = join(workdir(), 'external')
    const calls = []
    const run = (cmd, args, opts) => {
      calls.push([cmd, args])
      return runThatExtracts(COMPLETE)(cmd, args, opts)
    }

    await fetchContent(dest, { run })

    const [cmd, args] = calls[0]
    assert.equal(cmd, 'gh')
    assert.deepEqual(args.slice(0, 3), ['release', 'download', CONTENT_RELEASE])
    assert.ok(args.includes(CONTENT_ASSET))
    assert.ok(existsSync(join(dest, 'packages/content-schema/src/index.ts')))
    cleanup()
  })

  it('fails with the fix when the release does not exist', async () => {
    const dest = join(workdir(), 'external')
    const run = (cmd) => {
      if (cmd === 'gh') throw new Error('release not found')
      return ''
    }

    await assert.rejects(fetchContent(dest, { run }), (err) => {
      assert.match(err.message, /no persisted content/)
      assert.match(err.message, new RegExp(CONTENT_RELEASE))
      // Names the thing to re-run — the recovery is in another repo entirely.
      assert.match(err.message, /Publish content/)
      return true
    })
    cleanup()
  })

  it('fails when the tarball is missing something the build needs', async () => {
    const dest = join(workdir(), 'external')
    const partial = COMPLETE.filter((p) => p !== 'packages/content-schema/src/index.ts')

    await assert.rejects(fetchContent(dest, { run: runThatExtracts(partial) }), (err) => {
      assert.match(err.message, /missing/)
      assert.match(err.message, /content-schema/)
      return true
    })
    cleanup()
  })

  // A post deleted upstream has to disappear here. Merging into whatever was left
  // from the last build would keep it published forever.
  it('replaces the destination rather than merging into it', async () => {
    const dest = join(workdir(), 'external')
    mkdirSync(join(dest, 'content/posts'), { recursive: true })
    writeFileSync(join(dest, 'content/posts/deleted-upstream.md'), 'stale')

    await fetchContent(dest, { run: runThatExtracts(COMPLETE) })

    assert.equal(existsSync(join(dest, 'content/posts/deleted-upstream.md')), false)
    cleanup()
  })
})
