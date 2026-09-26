/**
 * The landing's project join: @rxova/brand's PROJECTS against sources.json.
 *
 * The real data is checked for the shape the pages rely on; the builder is run
 * against small fixtures for every way the two registries can disagree, because
 * each of those is meant to fail the build rather than ship a broken card.
 */

import { describe, expect, it } from 'vitest'

import { PROJECTS, type Project } from '@rxova/brand'

import sources from '../../../../sources.json'
import {
  buildLandingProjects,
  buildSiteSurfaces,
  landingProjects,
  landingSurfaces,
  listSentence,
  mountedProjects,
  navSurfaces,
  projectListSentence,
  siteSurfaces,
  type RawSource,
} from './projects'

const realSources = sources.sources as RawSource[]
const enabledPackages = realSources.filter((s) => (s.kind ?? 'package') === 'package' && s.enabled)

const project = (overrides: Partial<Project> = {}): Project => ({
  id: 'journey',
  label: 'journey',
  mount: '/packages/journey/',
  tagline: 'A tagline.',
  repo: 'https://github.com/rxova/journey',
  npm: 'https://www.npmjs.com/package/@rxova/journey-core',
  packages: ['@rxova/journey-core', '@rxova/journey-react'],
  ...overrides,
})

const source = (overrides: Partial<RawSource> = {}): RawSource => ({
  id: 'journey',
  enabled: true,
  landing: { blurb: 'A blurb.', tags: ['React'] },
  ...overrides,
})

describe('landingProjects', () => {
  it('lists exactly the enabled packages, in brand order', () => {
    const enabled = new Set(enabledPackages.map((s) => s.id))
    expect(landingProjects.map((p) => p.id)).toEqual(
      PROJECTS.filter((p) => enabled.has(p.id)).map((p) => p.id),
    )
  })

  it('keeps a disabled project off the page while still joining it', () => {
    const disabled = realSources.filter((s) => (s.kind ?? 'package') === 'package' && !s.enabled)
    const all = buildLandingProjects(PROJECTS, realSources)

    expect(all).toHaveLength(PROJECTS.length)
    for (const { id } of disabled) {
      expect(landingProjects.some((p) => p.id === id)).toBe(false)
      const card = all.find((p) => p.id === id)
      expect(card?.docsMounted).toBe(false)
      expect(card?.links.some((l) => l.label === 'Docs')).toBe(false)
    }
  })

  it('carries the brand metadata and the sources.json copy for every card', () => {
    for (const card of landingProjects) {
      const brand = PROJECTS.find((p) => p.id === card.id)
      const raw = realSources.find((s) => s.id === card.id)

      expect(card).toMatchObject({ ...brand, docsMounted: true })
      expect(card.blurb).toBe(raw?.landing?.blurb)
      expect(card.tags).toEqual(raw?.landing?.tags)
      expect(card.install).toBe(brand?.packages[0])
      expect(card.snippet).toBe(raw?.landing?.snippet)
    }
  })

  // Docs first, then "see it running", then the repo and the registry.
  it('orders every card’s links Docs … GitHub, npm, with only the off-site ones external', () => {
    for (const card of landingProjects) {
      const labels = card.links.map((l) => l.label)
      expect(labels[0]).toBe('Docs')
      expect(labels.slice(-2)).toEqual(['GitHub', 'npm'])
      expect(card.links[0]?.href).toBe(card.mount)
      for (const link of card.links) {
        expect(link.external === true).toBe(/^https:\/\//.test(link.href))
      }
    }
  })

  it('links a card to its Storybook only when that surface is enabled', () => {
    const storybooks = new Set(
      realSources.filter((s) => s.kind === 'storybook' && s.enabled).map((s) => s.id),
    )
    for (const card of landingProjects) {
      const link = card.links.find((l) => l.label === 'Storybook')
      if (storybooks.has(`storybook-${card.id}`)) {
        expect(link).toEqual({ label: 'Storybook', href: `/storybook/${card.id}/` })
      } else {
        expect(link).toBeUndefined()
      }
    }
  })

  it('links a card to its demo only when sources.json names one', () => {
    for (const card of landingProjects) {
      const demo = realSources.find((s) => s.id === card.id)?.landing?.demo
      const link = card.links.find((l) => l.label === 'Demo')
      expect(link).toEqual(demo ? { label: 'Demo', href: demo, external: true } : undefined)
    }
  })
})

describe('mountedProjects', () => {
  it('is every listed project as a footer link to its mount', () => {
    expect(mountedProjects).toEqual(
      landingProjects.map((p) => ({ id: p.id, label: p.label, href: p.mount })),
    )
  })
})

describe('site surfaces', () => {
  it('lists the enabled site entries of sources.json', () => {
    const ids = realSources.filter((s) => s.kind === 'site' && s.enabled).map((s) => s.id)
    expect(siteSurfaces.map((s) => s.id)).toEqual(ids)
    for (const surface of siteSurfaces) expect(surface.href).toBe(`/${surface.id}`)
  })

  it('names the known surfaces and falls back to the id for any other', () => {
    expect(
      buildSiteSurfaces([
        { id: 'blog', kind: 'site', enabled: true },
        { id: 'updates', kind: 'site', enabled: true },
        { id: 'changelog', kind: 'site', enabled: true },
      ]),
    ).toEqual([
      { id: 'blog', label: 'Blog', href: '/blog' },
      { id: 'updates', label: 'Updates', href: '/updates' },
      { id: 'changelog', label: 'changelog', href: '/changelog' },
    ])
  })

  it('leaves out disabled sites, packages and storybooks', () => {
    expect(
      buildSiteSurfaces([
        { id: 'blog', kind: 'site', enabled: false },
        { id: 'updates', kind: 'site' },
        { id: 'journey', enabled: true },
        { id: 'storybook-journey', kind: 'storybook', enabled: true },
      ]),
    ).toEqual([])
  })

  it('puts the mounted surfaces first and About last in the menu', () => {
    expect(landingSurfaces).toEqual([{ id: 'about', label: 'About', href: '/about' }])
    expect(navSurfaces).toEqual([...siteSurfaces, ...landingSurfaces])
    expect(navSurfaces.at(-1)?.id).toBe('about')
  })
})

describe('projectListSentence', () => {
  it('names every listed project, in order', () => {
    expect(projectListSentence).toBe(listSentence(landingProjects.map((p) => p.label)))
    for (const card of landingProjects) expect(projectListSentence).toContain(card.label)
  })
})

describe('listSentence', () => {
  it.each([
    [[], ''],
    [['journey'], 'journey'],
    [['journey', 'overlock'], 'journey and overlock'],
    [['a', 'b', 'c'], 'a, b, and c'],
    [['a', 'b', 'c', 'd'], 'a, b, c, and d'],
  ])('renders %j as "%s"', (labels, expected) => {
    expect(listSentence(labels)).toBe(expected)
  })
})

describe('buildLandingProjects', () => {
  it('joins a project with its source into a card', () => {
    const [card] = buildLandingProjects(
      [project()],
      [source({ landing: { blurb: 'A blurb.', tags: ['React'], snippet: 'go()' } })],
    )

    expect(card).toEqual({
      ...project(),
      blurb: 'A blurb.',
      tags: ['React'],
      install: '@rxova/journey-core',
      snippet: 'go()',
      links: [
        { label: 'Docs', href: '/packages/journey/' },
        { label: 'GitHub', href: 'https://github.com/rxova/journey', external: true },
        { label: 'npm', href: 'https://www.npmjs.com/package/@rxova/journey-core', external: true },
      ],
      docsMounted: true,
    })
  })

  it('omits the snippet key when there is none, rather than setting it undefined', () => {
    const [card] = buildLandingProjects([project()], [source()])
    expect(card).not.toHaveProperty('snippet')
  })

  it('adds the Storybook and Demo links in the slot after Docs', () => {
    const [card] = buildLandingProjects(
      [project()],
      [
        source({ landing: { blurb: 'b', tags: ['t'], demo: 'https://rxova.github.io/journey/' } }),
        { id: 'storybook-journey', kind: 'storybook', enabled: true },
      ],
    )
    expect(card?.links.map((l) => l.label)).toEqual(['Docs', 'Storybook', 'Demo', 'GitHub', 'npm'])
  })

  it('does not link a Storybook that is not enabled', () => {
    const [card] = buildLandingProjects(
      [project()],
      [source(), { id: 'storybook-journey', kind: 'storybook', enabled: false }],
    )
    expect(card?.links.map((l) => l.label)).toEqual(['Docs', 'GitHub', 'npm'])
  })

  it('builds a disabled project without a Docs link', () => {
    const [card] = buildLandingProjects([project()], [source({ enabled: false })])
    expect(card?.docsMounted).toBe(false)
    expect(card?.links.map((l) => l.label)).toEqual(['GitHub', 'npm'])
  })

  it('ignores site and storybook entries when matching sources to projects', () => {
    const cards = buildLandingProjects(
      [project()],
      [source(), { id: 'blog', kind: 'site', enabled: true }],
    )
    expect(cards.map((c) => c.id)).toEqual(['journey'])
  })

  it.each<[string, readonly Project[], readonly RawSource[], string]>([
    [
      'a source with no brand project',
      [project()],
      [source(), source({ id: 'overlock' })],
      '"overlock" is in sources.json but not in PROJECTS',
    ],
    [
      'a brand project with no source',
      [project(), project({ id: 'overlock', mount: '/packages/overlock/' })],
      [source()],
      '"overlock" is in PROJECTS but not in sources.json',
    ],
    [
      'a source with no landing copy',
      [project()],
      [source({ landing: undefined })],
      '"journey" has no landing.blurb in sources.json',
    ],
    [
      'a source with no tags',
      [project()],
      [source({ landing: { blurb: 'b', tags: [] } })],
      '"journey" has no landing.tags in sources.json',
    ],
    [
      'a project with no packages',
      [project({ packages: [] })],
      [source()],
      '"journey" has no packages in PROJECTS to install',
    ],
    [
      'a relative demo URL',
      [project()],
      [source({ landing: { blurb: 'b', tags: ['t'], demo: '/journey/demo' } })],
      '"journey" has a landing.demo that is not an absolute URL: /journey/demo',
    ],
    [
      'a mount that its id does not derive',
      [project({ mount: '/docs/journey/' })],
      [source()],
      '"journey" mounts at /docs/journey/, but its id derives /packages/journey/',
    ],
  ])('fails on %s', (_label, projects, sourceList, message) => {
    expect(() => buildLandingProjects(projects, sourceList)).toThrow(
      `[landing] sources.json and @rxova/brand disagree: ${message}\n`,
    )
  })

  it('lists both registries in the error so the fix is obvious', () => {
    expect(() =>
      buildLandingProjects(
        [project()],
        [source(), source({ id: 'overlock' }), { id: 'blog', kind: 'site' }],
      ),
    ).toThrow(
      '\n  brand PROJECTS: journey\n' +
        '  sources.json:   journey, overlock\n' +
        'Add the project to both, or remove it from both.',
    )
  })

  it('says "(none)" for an empty registry', () => {
    expect(() => buildLandingProjects([], [source()])).toThrow('brand PROJECTS: (none)\n')
    expect(() => buildLandingProjects([project()], [])).toThrow('sources.json:   (none)\n')
  })
})
