/**
 * The site map: which projects and repos exist, and the URLs that reach them.
 * Every rxova.org surface reads it — the landing, the docs switcher and the updates repo filter.
 */

import { describe, expect, it } from 'vitest'

import {
  RXOVA_ORIGIN,
  PROJECTS,
  REPOS,
  REPO_IDS,
  getProject,
  getRepo,
  docsUrl,
  siteUrl,
  canonicalUrl,
  projectFromBase,
  type ProjectId,
} from './sites.ts'

describe('PROJECTS', () => {
  it('has no duplicate ids', () => {
    expect(new Set(PROJECTS.map((p) => p.id)).size).toBe(PROJECTS.length)
  })

  // The aggregator derives `packages/<id>` from the id and only relocates the
  // built tree; a mount that disagrees deploys a page with every asset 404ing.
  it('mounts every project at the path its id derives', () => {
    for (const p of PROJECTS) expect(p.mount).toBe(`/packages/${p.id}/`)
  })

  it('gives every project a tagline, a repo, an npm link and at least one package', () => {
    for (const p of PROJECTS) {
      expect(p.tagline.length).toBeGreaterThan(0)
      expect(p.repo).toMatch(/^https:\/\/github\.com\//)
      expect(p.npm).toMatch(/^https:\/\/www\.npmjs\.com\//)
      expect(p.packages.length).toBeGreaterThan(0)
    }
  })
})

describe('getProject', () => {
  it('finds a project by id', () => {
    expect(getProject('journey').label).toBe('journey')
  })

  it('throws rather than returning undefined for an unknown id', () => {
    expect(() => getProject('nope' as ProjectId)).toThrow(/unknown project id: nope/)
  })
})

describe('REPOS', () => {
  // The whole reason REPOS exists: an update about the website or the brand repo
  // has to be representable, and neither ships a package.
  it('covers every project plus the repos that ship no package', () => {
    for (const p of PROJECTS) expect(REPO_IDS).toContain(p.id)
    expect(REPO_IDS).toContain('rxova-website')
    expect(REPO_IDS).toContain('brand')
  })

  it('marks which entries are projects', () => {
    expect(REPOS.filter((r) => r.project).map((r) => r.id)).toEqual(PROJECTS.map((p) => p.id))
    expect(REPOS.filter((r) => !r.project).map((r) => r.id)).toEqual(['rxova-website', 'brand'])
  })

  it('lists projects first, which is the order the repo filter renders', () => {
    const firstNonProject = REPOS.findIndex((r) => !r.project)
    expect(REPOS.slice(0, firstNonProject).every((r) => r.project)).toBe(true)
  })

  it('has no duplicate ids and a label and repo for each', () => {
    expect(new Set(REPO_IDS).size).toBe(REPOS.length)
    for (const r of REPOS) {
      expect(r.label.length).toBeGreaterThan(0)
      expect(r.repo).toMatch(/^https:\/\/github\.com\//)
    }
  })

  it('keeps REPO_IDS in step with REPOS', () => {
    expect([...REPO_IDS]).toEqual(REPOS.map((r) => r.id))
  })
})

describe('getRepo', () => {
  it('finds a project repo and a non-project repo alike', () => {
    expect(getRepo('journey').project).toBe(true)
    expect(getRepo('brand').label).toBe('Brand')
  })

  it('throws on an unknown id', () => {
    expect(() => getRepo('nope' as never)).toThrow(/unknown repo id: nope/)
  })
})

describe('urls', () => {
  it('builds an absolute docs url', () => {
    expect(docsUrl('journey')).toBe(`${RXOVA_ORIGIN}/packages/journey/`)
  })

  it('builds a site url from a path with or without a leading slash', () => {
    expect(siteUrl('/privacy')).toBe(`${RXOVA_ORIGIN}/privacy`)
    expect(siteUrl('privacy')).toBe(`${RXOVA_ORIGIN}/privacy`)
  })

  it('defaults to the origin root', () => {
    expect(siteUrl()).toBe(`${RXOVA_ORIGIN}/`)
  })
})

describe('canonicalUrl', () => {
  // The bug this exists to prevent: /blog answers 301 and only /blog/ answers
  // 200, so a canonical without the slash points a crawler at a redirect.
  it('always ends in a slash, whatever the caller passed', () => {
    expect(canonicalUrl('/blog')).toBe(`${RXOVA_ORIGIN}/blog/`)
    expect(canonicalUrl('/blog/')).toBe(`${RXOVA_ORIGIN}/blog/`)
    expect(canonicalUrl('/updates/repos/journey')).toBe(`${RXOVA_ORIGIN}/updates/repos/journey/`)
  })

  it('roots a path that arrives without a leading slash', () => {
    expect(canonicalUrl('blog')).toBe(`${RXOVA_ORIGIN}/blog/`)
  })

  it('defaults to the origin root', () => {
    expect(canonicalUrl()).toBe(`${RXOVA_ORIGIN}/`)
  })

  // siteUrl builds nav hrefs, where following a redirect costs nothing. Keeping
  // them different is the point; collapsing them would reintroduce the bug.
  it('differs from siteUrl, which does not normalise', () => {
    expect(siteUrl('/blog')).toBe(`${RXOVA_ORIGIN}/blog`)
    expect(canonicalUrl('/blog')).not.toBe(siteUrl('/blog'))
  })
})

describe('projectFromBase', () => {
  it('recognises a mount with and without its trailing slash', () => {
    expect(projectFromBase('/packages/journey/')).toBe('journey')
    expect(projectFromBase('/packages/journey')).toBe('journey')
  })

  // A standalone docs build has base "/" and belongs to no project. Returning
  // undefined is correct there — the switcher simply omits the current marker.
  it('returns undefined for a base that is not a mount', () => {
    expect(projectFromBase('/')).toBeUndefined()
    expect(projectFromBase('/packages/nope/')).toBeUndefined()
  })
})
