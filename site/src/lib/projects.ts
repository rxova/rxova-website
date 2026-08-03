/**
 * The landing's project list, assembled from the two registries that own it.
 *
 * - `@rxova/brand` owns *product* metadata — label, tagline, repo, npm, packages.
 *   It has to: the docs sites at /packages/* read the same list over npm to build
 *   their project switcher, and they cannot see this repo.
 * - `sources.json` owns *deployment* config and the landing-only copy (blurb, tags).
 *   It has to: the CI matrix is generated from it, and it cannot be published to npm
 *   on the brand package's release cycle.
 *
 * Neither can absorb the other, so this module joins them on `id` and — more
 * importantly — refuses to build if they disagree. Before this existed the
 * landing kept its own third copy of the metadata, and it had already drifted:
 * react-inputs was advertised with one tagline here and a different one in the
 * docs switcher.
 *
 * Everything below runs at build time. `astro build` is static, so a thrown error
 * here fails the build (and CI) rather than shipping a half-correct page.
 */

import { PROJECTS, type Project } from '@rxova/brand'

// Resolved by Vite at build time. `sources.json` sits at the repo root, outside
// the Astro project — see astro.config.mjs, which widens the dev server's fs
// allowlist so `pnpm dev` can read it too.
import sources from '../../../sources.json'

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
  /** False when the project's docs are not mounted yet — see `enabled` in sources.json. */
  docsMounted: boolean
}

interface RawSource {
  id: string
  kind?: string
  enabled?: boolean
  landing?: { blurb?: string; tags?: string[] }
}

// Only the packages. `sources.json` also carries `kind: "site"` entries — /blog and
// /updates, built in the brand monorepo and mounted like any other dist — and those
// are surfaces of rxova.org rather than projects: no npm package, no docs, no
// landing card, and deliberately absent from @rxova/brand's PROJECTS.
const rawSources: RawSource[] = (sources.sources ?? []).filter(
  (s: RawSource) => (s.kind ?? 'package') === 'package',
)

// Storybook surfaces (`kind: "storybook"`, id `storybook-<project>`, mounted at
// /storybook/<project>/) are neither packages nor site surfaces: each belongs to
// a project, so it surfaces as a link on that project's card rather than as a
// menu entry of its own. Same gating as everything else — the link only renders
// once the surface is enabled, so the card cannot advertise a 404.
const mountedStorybooks = new Set(
  ((sources.sources ?? []) as RawSource[])
    .filter((s) => s.kind === 'storybook' && s.enabled === true)
    .map((s) => s.id),
)

function fail(message: string): never {
  throw new Error(
    `[landing] sources.json and @rxova/brand disagree: ${message}\n` +
      `  brand PROJECTS: ${PROJECTS.map((p) => p.id).join(', ') || '(none)'}\n` +
      `  sources.json:   ${rawSources.map((s) => s.id).join(', ') || '(none)'}\n` +
      `Add the project to both, or remove it from both.`,
  )
}

function build(): LandingProject[] {
  // A project in sources.json with no brand entry would build and mount docs that
  // no switcher links to, and that the landing cannot describe. Catch it here.
  for (const s of rawSources) {
    if (!PROJECTS.some((p) => p.id === s.id))
      fail(`"${s.id}" is in sources.json but not in PROJECTS`)
  }

  // Brand order is display order — it is what the docs switcher uses, so the
  // landing lists projects the same way round.
  return PROJECTS.map((project) => {
    const source = rawSources.find((s) => s.id === project.id)
    if (!source) fail(`"${project.id}" is in PROJECTS but not in sources.json`)

    const { blurb, tags } = source.landing ?? {}
    if (!blurb) fail(`"${project.id}" has no landing.blurb in sources.json`)
    if (!tags?.length) fail(`"${project.id}" has no landing.tags in sources.json`)

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
      links: [
        // Only link to docs that are actually deployed. A disabled project is
        // still worth showing — it just has nowhere to point yet.
        ...(docsMounted ? [{ label: 'Docs', href: project.mount }] : []),
        ...(mountedStorybooks.has(`storybook-${project.id}`)
          ? [{ label: 'Storybook', href: `/storybook/${project.id}/` }]
          : []),
        { label: 'GitHub', href: project.repo, external: true },
        { label: 'npm', href: project.npm, external: true },
      ],
      docsMounted,
    }
  })
}

export const landingProjects: readonly LandingProject[] = build()

/**
 * The standalone surfaces of rxova.org that are actually deployed.
 *
 * `/blog` and `/updates` are built in the brand monorepo and mounted here like any
 * other dist, so until their first artifact arrives they do not exist. Reading the
 * same `enabled` flag the mount does means the menu cannot advertise a 404 — the
 * flag gates the link and the mount together, which is the whole reason it lives in
 * git rather than in a repo variable.
 */
export interface SiteSurface {
  id: string
  label: string
  href: string
}

const LABELS: Record<string, string> = { blog: 'Blog', updates: 'Updates' }

export const siteSurfaces: readonly SiteSurface[] = ((sources.sources ?? []) as RawSource[])
  .filter((s) => s.kind === 'site' && s.enabled === true)
  .map((s) => ({ id: s.id, label: LABELS[s.id] ?? s.id, href: `/${s.id}` }))

/**
 * Surfaces this repo builds itself, rather than mounts.
 *
 * /about is a page of the landing's own Astro build, so unlike /blog and
 * /updates there is no artifact to wait for and nothing to gate: if this build
 * ships, the page ships. It still belongs in the same lists as the mounted
 * surfaces — the header menu and the footer's "Site" column — which is what
 * `navSurfaces` is for.
 */
export const landingSurfaces: readonly SiteSurface[] = [
  { id: 'about', label: 'About', href: '/about' },
]

/**
 * The standalone surfaces of rxova.org, in menu order.
 *
 * Mounted ones first (Blog, Updates), then the landing's own pages. About sits
 * last on purpose: it is who-and-why, which a reader looks for after the work,
 * not before it.
 */
export const navSurfaces: readonly SiteSurface[] = [...siteSurfaces, ...landingSurfaces]

/** "Journey, react-inputs, and use-everywhere" — for the page's meta descriptions. */
export const projectListSentence: string = (() => {
  const labels = landingProjects.map((p) => p.label)
  if (labels.length <= 1) return labels[0] ?? ''
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`
  return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`
})()
