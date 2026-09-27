import { describe, expect, it } from 'vitest'

import { MAINTAINER, STANDARDS } from './about'
import {
  FEATURED_PROJECT_ID,
  STANDARD_ICONS,
  featuredIndex,
  organizationJsonLd,
  scriptJson,
} from './home'
import { landingProjects, projectListSentence } from './projects'

describe('featuredIndex', () => {
  it('finds the featured project among the real ones', () => {
    expect(landingProjects[featuredIndex(landingProjects)]?.id).toBe(FEATURED_PROJECT_ID)
  })

  it('throws, naming the known ids, for a project that does not exist', () => {
    expect(() => featuredIndex([{ id: 'a' }, { id: 'b' }], 'nope')).toThrow(
      '[landing] FEATURED_PROJECT_ID "nope" is not a project. Known: a, b.',
    )
  })
})

describe('organizationJsonLd', () => {
  const data = organizationJsonLd(landingProjects, MAINTAINER, projectListSentence)

  it('lists every landing project, and only those', () => {
    expect(data.hasPart.map((p) => p.name)).toEqual(landingProjects.map((p) => p.label))
  })

  it('ties the maintainer and their profiles to the organisation', () => {
    expect(data.founder).toEqual({ '@type': 'Person', name: MAINTAINER.name })
    expect(data.sameAs).toEqual([MAINTAINER.org, ...MAINTAINER.links.map((l) => l.href)])
  })
})

describe('scriptJson', () => {
  it('escapes `<` so a string cannot close the script element, and still parses back', () => {
    const json = scriptJson({ copy: '</script><b>' })
    expect(json).not.toContain('<')
    expect(JSON.parse(json)).toEqual({ copy: '</script><b>' })
  })
})

describe('STANDARD_ICONS', () => {
  it('has a glyph for every standard', () => {
    for (const { id } of STANDARDS) expect(STANDARD_ICONS[id], id).toBeDefined()
  })
})
