/**
 * What rxova-website's `sources.json` may contain, and where a source mounts.
 */

import { describe, expect, it } from 'vitest'

import { sourceEntry, mountFor, baseFor, RESERVED_PATHS, SOURCE_KINDS } from './registry.ts'

describe('sourceEntry', () => {
  const pkg = {
    id: 'journey',
    kind: 'package',
    enabled: true,
    landing: { blurb: 'b', tags: ['t'] },
  }
  const site = { id: 'blog', kind: 'site', enabled: true, repo: 'rxova/brand' }
  const storybook = {
    id: 'storybook-react-inputs',
    kind: 'storybook',
    enabled: true,
    repo: 'rxova/react-inputs',
  }

  it('accepts a package with landing copy and a site without', () => {
    expect(sourceEntry.safeParse(pkg).success).toBe(true)
    expect(sourceEntry.safeParse(site).success).toBe(true)
  })

  it('accepts a storybook surface with a prefixed id and an explicit repo', () => {
    expect(sourceEntry.safeParse(storybook).success).toBe(true)
  })

  // The prefix keeps ids unique across kinds (the bare project id would collide
  // with the package entry it belongs to) and is what the mount derivation strips.
  it.each(['react-inputs', 'storybook-', 'storybook'])(
    'refuses a storybook surface with id %s',
    (id) => {
      expect(sourceEntry.safeParse({ ...storybook, id }).success).toBe(false)
    },
  )

  it('refuses a storybook surface with no repo — rxova/<id> is nowhere', () => {
    const noRepo = { id: storybook.id, kind: storybook.kind, enabled: storybook.enabled }
    expect(sourceEntry.safeParse(noRepo).success).toBe(false)
  })

  it('refuses landing copy on a storybook surface, which would never render', () => {
    expect(sourceEntry.safeParse({ ...storybook, landing: { blurb: 'x' } }).success).toBe(false)
  })

  it('defaults kind to package and enabled to false', () => {
    const parsed = sourceEntry.parse({ id: 'foo', landing: { blurb: 'b' } })
    expect(parsed.kind).toBe('package')
    // Absent means disabled: one you forgot to flip on is a missing docs section,
    // one you forgot to flip off is a broken deploy.
    expect(parsed.enabled).toBe(false)
  })

  it('needs landing.blurb on a package, because it gets a card', () => {
    expect(sourceEntry.safeParse({ id: 'journey', kind: 'package' }).success).toBe(false)
  })

  it('refuses landing copy on a site, which would never render', () => {
    expect(sourceEntry.safeParse({ ...site, landing: { blurb: 'x' } }).success).toBe(false)
  })

  // A site mounts at /<id>/, so its id is a top-level path. One colliding with the
  // landing's own pages or the docs tree would shadow or be shadowed depending on
  // copy order — a failure nobody would think to look for.
  it.each(RESERVED_PATHS)('refuses a site claiming the reserved path %s', (id) => {
    expect(sourceEntry.safeParse({ id, kind: 'site' }).success).toBe(false)
  })

  it('lets a package use a name that is reserved only at the top level', () => {
    expect(sourceEntry.safeParse({ id: 'terms', landing: { blurb: 'b' } }).success).toBe(true)
  })

  it.each([
    ['an unknown field', { ...site, mount: 'blog' }],
    ['an unknown kind', { id: 'x', kind: 'website' }],
    ['a malformed repo', { ...site, repo: 'not-a-repo' }],
    ['an uppercase id', { id: 'Blog', kind: 'site' }],
    ['an id opening with a dash', { id: '-blog', kind: 'site' }],
  ])('refuses %s', (_label, value) => {
    expect(sourceEntry.safeParse(value).success).toBe(false)
  })
})

describe('mountFor / baseFor', () => {
  it('derives the two shapes', () => {
    expect(mountFor('journey')).toBe('packages/journey')
    expect(baseFor('journey')).toBe('/packages/journey/')
    expect(mountFor('blog', 'site')).toBe('blog')
    expect(baseFor('blog', 'site')).toBe('/blog/')
    // The prefix comes off and the workshop nests under the shared root, so
    // /storybook/ can hold every project's storybook side by side.
    expect(mountFor('storybook-react-inputs', 'storybook')).toBe('storybook/react-inputs')
    expect(baseFor('storybook-use-everywhere', 'storybook')).toBe('/storybook/use-everywhere/')
  })

  // The property the derivation exists to guarantee: a tree built for `base` and
  // copied to `mount` cannot end up serving its assets from somewhere else.
  it.each(SOURCE_KINDS)('keeps base and mount in agreement for kind %s', (kind) => {
    expect(baseFor('foo', kind)).toBe(`/${mountFor('foo', kind)}/`)
  })
})
