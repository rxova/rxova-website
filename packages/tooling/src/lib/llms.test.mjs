// The root llms.txt is the only thing that tells an agent the other projects
// exist. Its failure mode is the same silent one the sitemap has — a stale or
// missing entry looks exactly like a correct one — so what these tests pin down
// is the fallback for a project that ships no index of its own, and that a
// disabled or non-prose source never appears.

import { describe, it, beforeEach, afterAll } from 'vitest'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { writeLlms, llmsIndex, LLMS_FILE } from './llms.mjs'

const roots = []
let root
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'rxova-llms-'))
  roots.push(root)
})
afterAll(() => {
  for (const dir of roots) rmSync(dir, { recursive: true, force: true })
})

const ORIGIN = 'https://rxova.org'

function write(path, body) {
  const full = join(root, path)
  mkdirSync(join(full, '..'), { recursive: true })
  writeFileSync(full, body)
}

const read = () => readFileSync(join(root, LLMS_FILE), 'utf8')
const links = (doc) => [...doc.matchAll(/^- \[([^\]]*)\]\(([^)]*)\)/gm)].map((m) => [m[1], m[2]])

/** A resolved source, shaped as scripts/registry.mjs hands them over. */
const source = (id, over = {}) => ({
  id,
  kind: 'package',
  base: `/packages/${id}/`,
  mount: `packages/${id}`,
  landing: {},
  ...over,
})

describe('llmsIndex', () => {
  it('opens with the H1 and blockquote summary llmstxt.org specifies', () => {
    const doc = llmsIndex({ projects: [], sites: [] }, ORIGIN)
    const lines = doc.split('\n')

    assert.equal(lines[0], '# Rxova')
    assert.equal(lines[1], '')
    assert.match(lines[2], /^> /)
  })

  it('omits a section that has no entries rather than printing an empty heading', () => {
    const entry = { label: 'journey', url: 'https://rxova.org/packages/journey/' }
    const doc = llmsIndex({ projects: [entry], sites: [] }, ORIGIN)

    assert.match(doc, /## Libraries/)
    assert.doesNotMatch(doc, /## Also on this site/)
  })

  it('appends the blurb as the link note, and omits the separator without one', () => {
    const doc = llmsIndex(
      {
        projects: [{ label: 'a', url: 'https://rxova.org/a/', note: 'Does a thing.' }],
        sites: [{ label: 'b', url: 'https://rxova.org/b/' }],
      },
      ORIGIN,
    )

    assert.match(doc, /^- \[a]\(https:\/\/rxova\.org\/a\/\): Does a thing\.$/m)
    assert.match(doc, /^- \[b]\(https:\/\/rxova\.org\/b\/\)$/m)
  })
})

describe('writeLlms', () => {
  it('links a project to its own llms.txt when it publishes one', async () => {
    write(`packages/journey/${LLMS_FILE}`, '# journey\n')

    await writeLlms(root, [source('journey')], ORIGIN)

    assert.deepEqual(links(read()), [['journey', 'https://rxova.org/packages/journey/llms.txt']])
  })

  // The property that lets this repo and a project repo ship in either order.
  it('falls back to the docs root for a project that ships none', async () => {
    write('packages/journey/index.html', '<!doctype html>')

    await writeLlms(root, [source('journey')], ORIGIN)

    assert.deepEqual(links(read()), [['journey', 'https://rxova.org/packages/journey/']])
  })

  it('mixes the two without either affecting the other', async () => {
    write(`packages/react-inputs/${LLMS_FILE}`, '# react-inputs\n')

    await writeLlms(root, [source('journey'), source('react-inputs')], ORIGIN)

    assert.deepEqual(links(read()), [
      ['journey', 'https://rxova.org/packages/journey/'],
      ['react-inputs', 'https://rxova.org/packages/react-inputs/llms.txt'],
    ])
  })

  it('separates the libraries from the other sites on this domain', async () => {
    const { projects, sites } = await writeLlms(
      root,
      [source('journey'), source('blog', { kind: 'site', base: '/blog/', mount: 'blog' })],
      ORIGIN,
    )

    assert.deepEqual(
      projects.map((p) => p.label),
      ['journey'],
    )
    assert.deepEqual(
      sites.map((s) => s.label),
      ['blog'],
    )
    assert.match(read(), /## Libraries[\s\S]*## Also on this site/)
  })

  // A component explorer has no prose to read; its project's index is the useful
  // destination, and listing both sends an agent down the wrong one half the time.
  it('skips storybook, which has nothing for an agent to read', async () => {
    await writeLlms(
      root,
      [
        source('react-inputs'),
        source('storybook-react-inputs', {
          kind: 'storybook',
          base: '/storybook/react-inputs/',
          mount: 'storybook/react-inputs',
        }),
      ],
      ORIGIN,
    )

    assert.deepEqual(links(read()), [['react-inputs', 'https://rxova.org/packages/react-inputs/']])
  })

  it('carries the blurb sources.json already holds', async () => {
    await writeLlms(
      root,
      [source('journey', { landing: { blurb: 'Model multi-step, branching flows as a graph.' } })],
      ORIGIN,
    )

    assert.match(read(), /: Model multi-step, branching flows as a graph\.$/m)
  })

  it('honours a staging origin so a preview does not advertise production URLs', async () => {
    write(`packages/journey/${LLMS_FILE}`, '# journey\n')

    await writeLlms(root, [source('journey')], 'https://web.rxova.org')

    assert.deepEqual(links(read()), [
      ['journey', 'https://web.rxova.org/packages/journey/llms.txt'],
    ])
  })
})
