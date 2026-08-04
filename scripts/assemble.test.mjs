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
import { composeDocument } from './assemble.mjs'
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
  // `landing` copy is required of a package by the shared schema, so the fixture
  // carries it; these tests are about mounting, not about the home page.
  sources: raw.map((r) =>
    resolveSource({ enabled: true, landing: { blurb: 'b', tags: ['t'] }, ...r }),
  ),
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

  // The index is written from the finished tree, so it can only be right if it
  // runs after the projects are mounted. Assert it sees a project's own llms.txt
  // that arrived in that project's artifact.
  it('writes the agent index once every project is mounted', async () => {
    artifact('landing', { 'index.html': 'landing' })
    artifact('docs-journey', { 'index.html': 'journey docs' })
    artifact('docs-react-inputs', { 'index.html': 'docs', 'llms.txt': '# react-inputs\n' })

    await run(registry({ id: 'journey' }, { id: 'react-inputs' }))

    const index = read('llms.txt')
    assert.match(index, /^# Rxova$/m)
    assert.match(
      index,
      /^- \[react-inputs]\(https:\/\/rxova\.org\/packages\/react-inputs\/llms\.txt\)/m,
    )
    // No index of its own yet, so the docs root — not a link that would 404.
    assert.match(index, /^- \[journey]\(https:\/\/rxova\.org\/packages\/journey\/\)/m)
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

describe('page-component composition', () => {
  const shell = `<!doctype html><html lang="en" data-rxova-shell><head>
    <meta charset="utf-8"><meta name="viewport" content="width=device-width">
    <title>private shell</title><meta name="robots" content="noindex">
    <meta name="rxova-head-slot" content=""><script data-analytics></script>
  </head><body><header class="site">Rxova</header><template data-rxova-page-slot></template>
    <footer class="website-footer">Footer</footer></body></html>`

  it('preserves page metadata, attributes and UI inside the website shell', () => {
    const source = `<!doctype html><html class="starlight" data-has-sidebar><head>
      <meta charset="utf-8"><meta name="viewport" content="source">
      <title>Guide</title><meta name="description" content="A guide">
      <link rel="stylesheet" href="/docs.css"><link rel="icon" href="/old.svg">
    </head><body class="docs"><header class="header">Search</header><main>Guide body</main></body></html>`
    const output = composeDocument(source, shell)
    assert.match(output, /data-rxova-shell/)
    assert.match(output, /class="starlight"/)
    assert.match(output, /class="docs"/)
    assert.match(output, /<title>Guide<\/title>/)
    assert.match(output, /A guide/)
    assert.match(output, /\/docs\.css/)
    assert.doesNotMatch(output, /old\.svg/)
    assert.match(output, /<header class="site">Rxova<\/header>/)
    assert.match(output, /<header class="header">Search<\/header>/)
    assert.match(output, /<main>Guide body<\/main>/)
    assert.match(output, /website-footer/)
    assert.doesNotMatch(output, /private shell/)
    assert.doesNotMatch(output, /noindex/)
  })

  it('rejects producer-owned global chrome and analytics', () => {
    assert.throws(
      () =>
        composeDocument(
          '<html><head></head><body><main></main><footer class="rx-footer"></footer></body></html>',
          shell,
        ),
      /global Rxova chrome/,
    )
    assert.throws(
      () =>
        composeDocument(
          '<html><head><script src="https://static.cloudflareinsights.com/beacon.min.js"></script></head><body><main></main></body></html>',
          shell,
        ),
      /Cloudflare Analytics/,
    )
  })

  it('composes static redirect documents without requiring a main element', () => {
    const output = composeDocument(
      '<html><head><title>Redirect</title><meta http-equiv="refresh" content="0;url=/next/"></head><body><a href="/next/">Continue</a></body></html>',
      shell,
    )
    assert.match(output, /http-equiv="refresh"/)
    assert.match(output, /Continue/)
  })
})
