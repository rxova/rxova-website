/**
 * The landing's project list: `@rxova/brand`'s product metadata joined on `id` with
 * `sources.json`'s deployment config and copy. Runs at build time; throws if they disagree.
 */

import { PROJECTS, type Project } from '@rxova/brand'

// `sources.json` sits at the repo root, outside the Astro project; astro.config.mjs
// widens the dev server's fs allowlist so `pnpm dev` can read it.
import sources from '../../../../sources.json'

export interface LandingLink {
  label: string
  href: string
  external?: boolean
}

/** A brand project plus the landing-only copy that describes it on the home page. */
export interface LandingProject extends Project {
  blurb: string
  tags: readonly string[]
  links: readonly LandingLink[]
  /** The package a newcomer installs first: brand's `packages[0]` ("most prominent first"). */
  install: string
  /** Optional few lines showing the API. Absent is fine; the card just omits it. */
  snippet?: string
  /** False when the project's docs are not mounted yet — see `enabled` in sources.json. */
  docsMounted: boolean
}

/** One entry of `sources.json`'s `sources` list, as far as the landing reads it. */
export interface RawSource {
  id: string
  kind?: string
  enabled?: boolean
  landing?: { blurb?: string; tags?: string[]; demo?: string; snippet?: string }
}

const allSources = (sources.sources ?? []) as RawSource[]

/**
 * Joins brand `projects` with `sources.json`'s entries, one card per project in
 * brand order, enabled or not — and throws if the two disagree.
 */
export function buildLandingProjects(
  projects: readonly Project[],
  sourceList: readonly RawSource[],
): LandingProject[] {
  // Only the packages: `kind: "site"` entries (/blog, /updates) are surfaces, not projects.
  const rawSources = sourceList.filter((s) => (s.kind ?? 'package') === 'package')

  // An enabled Storybook (`storybook-<project>`) becomes a link on its project's card,
  // so a card never advertises a 404.
  const mountedStorybooks = new Set(
    sourceList.filter((s) => s.kind === 'storybook' && s.enabled === true).map((s) => s.id),
  )

  function fail(message: string): never {
    throw new Error(
      `[landing] sources.json and @rxova/brand disagree: ${message}\n` +
        `  brand PROJECTS: ${projects.map((p) => p.id).join(', ') || '(none)'}\n` +
        `  sources.json:   ${rawSources.map((s) => s.id).join(', ') || '(none)'}\n` +
        `Add the project to both, or remove it from both.`,
    )
  }

  // A project in sources.json with no brand entry would build and mount docs that
  // no switcher links to, and that the landing cannot describe. Catch it here.
  for (const s of rawSources) {
    if (!projects.some((p) => p.id === s.id))
      fail(`"${s.id}" is in sources.json but not in PROJECTS`)
  }

  // Brand order is display order — it is what the docs switcher uses, so the
  // landing lists projects the same way round.
  return projects.map((project) => {
    const source = rawSources.find((s) => s.id === project.id)
    if (!source) fail(`"${project.id}" is in PROJECTS but not in sources.json`)

    const { blurb, tags, demo, snippet } = source.landing ?? {}
    if (!blurb) fail(`"${project.id}" has no landing.blurb in sources.json`)
    if (!tags?.length) fail(`"${project.id}" has no landing.tags in sources.json`)

    // A card without an install line is a bug, not something to render around.
    const install = project.packages[0]
    if (!install) fail(`"${project.id}" has no packages in PROJECTS to install`)

    // A demo is an absolute URL the project's own repo deploys; a relative one would
    // point at rxova.org and 404.
    if (demo !== undefined && !/^https?:\/\//.test(demo)) {
      fail(`"${project.id}" has a landing.demo that is not an absolute URL: ${demo}`)
    }

    // The mount comes from brand (the docs sites need it too); sources.json derives
    // the same path from `id`. If they ever diverge the site 404s, so assert it.
    if (project.mount !== `/packages/${project.id}/`) {
      fail(
        `"${project.id}" mounts at ${project.mount}, but its id derives /packages/${project.id}/`,
      )
    }

    const docsMounted = source.enabled === true

    return {
      ...project,
      blurb,
      tags,
      install,
      ...(snippet ? { snippet } : {}),
      links: [
        // Only link to docs that are actually deployed. `landingProjects` drops
        // disabled projects anyway; the guard keeps the builder honest on its own.
        ...(docsMounted ? [{ label: 'Docs', href: project.mount }] : []),
        ...(mountedStorybooks.has(`storybook-${project.id}`)
          ? [{ label: 'Storybook', href: `/storybook/${project.id}/` }]
          : []),
        // Same slot as Storybook: both are "see it running", so they sit right
        // after Docs and before the repo/registry links.
        ...(demo ? [{ label: 'Demo', href: demo, external: true }] : []),
        { label: 'GitHub', href: project.repo, external: true },
        { label: 'npm', href: project.npm, external: true },
      ],
      docsMounted,
    }
  })
}

/**
 * The projects the landing lists: only the enabled ones.
 * The builder still checks every project, so a disagreement fails the build either way.
 */
export const landingProjects: readonly LandingProject[] = buildLandingProjects(
  PROJECTS,
  allSources,
).filter((p) => p.docsMounted)

/**
 * The projects whose docs are actually mounted, as footer links.
 * Gated on `enabled` like the mount itself, so the footer never links to a 404.
 */
export const mountedProjects: readonly SiteSurface[] = landingProjects
  .filter((p) => p.docsMounted)
  .map((p) => ({ id: p.id, label: p.label, href: p.mount }))

/**
 * The standalone surfaces of rxova.org that are actually deployed (/blog, /updates).
 * Gated on the same `enabled` flag as the mount, so the menu never advertises a 404.
 */
export interface SiteSurface {
  id: string
  label: string
  href: string
}

const LABELS: Record<string, string> = { blog: 'Blog', updates: 'Updates' }

/** The enabled `kind: "site"` entries, as menu links. */
export function buildSiteSurfaces(sourceList: readonly RawSource[]): SiteSurface[] {
  return sourceList
    .filter((s) => s.kind === 'site' && s.enabled === true)
    .map((s) => ({ id: s.id, label: LABELS[s.id] ?? s.id, href: `/${s.id}` }))
}

export const siteSurfaces: readonly SiteSurface[] = buildSiteSurfaces(allSources)

/**
 * Surfaces this repo builds itself rather than mounts, so there is nothing to gate.
 * They join the mounted ones in `navSurfaces`.
 */
export const landingSurfaces: readonly SiteSurface[] = [
  { id: 'about', label: 'About', href: '/about' },
]

/** The standalone surfaces in menu order: mounted ones (Blog, Updates), then the landing's own. */
export const navSurfaces: readonly SiteSurface[] = [...siteSurfaces, ...landingSurfaces]

/** "a" · "a and b" · "a, b, and c" */
export function listSentence(labels: readonly string[]): string {
  if (labels.length <= 1) return labels[0] ?? ''
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`
  return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`
}

/** "journey, react-inputs, and use-everywhere" — for the page's meta descriptions. */
export const projectListSentence: string = listSentence(landingProjects.map((p) => p.label))
