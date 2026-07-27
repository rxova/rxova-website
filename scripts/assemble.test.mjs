// The assembler is the last step before a deploy, and its most valuable
// behaviour is refusing: an enabled project whose artifact never arrived means
// its build job failed to upload, and publishing anyway ships a site with a
// section missing and its landing link 404ing. That refusal is what these tests
// mostly cover — the happy path is a `cp -r`.

import { describe, it, beforeEach, afterAll } from 'vitest'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { assemble } from './assemble.mjs'
import { resolveSource } from './registry.mjs'

const roots = []
let root
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'rxova-assemble-'))
  roots.push(root)
})
afterAll(() => {
  for (const dir of roots) rmSync(dir, { recursive: true, force: true })
})

const registry = (...raw) => ({
  landing: { artifact: 'landing', mount: '.' },
  sources: raw.map((r) => resolveSource({ build: 'b', enabled: true, ...r })),
})

/** Write an artifact directory as download-artifact would leave it. */
function artifact(name, files) {
  for (const [path, body] of Object.entries(files)) {
    const full = join(root, 'artifacts', name, path)
    mkdirSync(join(full, '..'), { recursive: true })
    writeFileSync(full, body)
  }
}

const run = (config) => assemble(config, join(root, 'artifacts'), join(root, '_site'))
const site = (...parts) => join(root, '_site', ...parts)
const read = (...parts) => readFileSync(site(...parts), 'utf8')

describe('assemble', () => {
  it('puts the landing at the root and each project under its mount', () => {
    artifact('landing', { 'index.html': 'landing', 'assets/site.css': 'css' })
    artifact('docs-journey', { 'index.html': 'journey docs' })
    artifact('docs-use-everywhere', { 'index.html': 'ue docs', 'guide/index.html': 'guide' })

    return run(registry({ id: 'journey' }, { id: 'use-everywhere' })).then(() => {
      assert.equal(read('index.html'), 'landing')
      assert.equal(read('assets/site.css'), 'css')
      // The mount must match the base the docs were built with, or every asset 404s.
      assert.equal(read('packages/journey/index.html'), 'journey docs')
      assert.equal(read('packages/use-everywhere/guide/index.html'), 'guide')
    })
  })

  it('refuses to deploy when an enabled project has no artifact', async () => {
    artifact('landing', { 'index.html': 'landing' })
    await assert.rejects(
      run(registry({ id: 'journey' })),
      /enabled project\(s\) with no artifact[\s\S]*journey/,
    )
  })

  it('names every missing project, not just the first', async () => {
    artifact('landing', { 'index.html': 'landing' })
    await assert.rejects(run(registry({ id: 'a' }, { id: 'b' })), (err) => {
      assert.match(err.message, /\ba\b/)
      assert.match(err.message, /\bb\b/)
      return true
    })
  })

  it('does not require an artifact for a disabled project', async () => {
    artifact('landing', { 'index.html': 'landing' })
    await run(registry({ id: 'later', enabled: false }))
    assert.equal(existsSync(site('packages/later')), false, 'and does not mount it')
  })

  it('refuses to deploy without the landing', async () => {
    artifact('docs-journey', { 'index.html': 'journey' })
    await assert.rejects(run(registry({ id: 'journey' })), /landing artifact missing/)
  })

  it('starts from a clean tree, so a removed project does not linger', async () => {
    artifact('landing', { 'index.html': 'landing' })
    mkdirSync(site('packages/gone'), { recursive: true })
    writeFileSync(site('packages/gone/index.html'), 'stale docs from a previous run')

    await run(registry())
    assert.equal(existsSync(site('packages/gone')), false)
  })

  it('deploys landing-only when nothing is enabled', async () => {
    artifact('landing', { 'index.html': 'landing' })
    await run(registry())
    assert.equal(read('index.html'), 'landing')
  })
})
