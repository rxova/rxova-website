// fetch-docs turns the registry into a download plan at deploy time. The gh and
// tar calls are the workflow's business; what is worth pinning is the mapping —
// only enabled projects are fetched, and each lands where assemble.mjs will read
// it (artifacts/<artifact>), from the release the ingest side persisted it to.

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { fetchPlan } from './fetch-docs.mjs'
import { loadRegistry } from './registry.mjs'

const registry = {
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

  it('extracts into artifacts/<artifact>, exactly where assemble.mjs reads it', () => {
    const [plan] = fetchPlan(registry)
    assert.equal(plan.dest, registry.sources[0].artifact)
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
