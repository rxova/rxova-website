/**
 * The rxova.org site map.
 *
 * rxova.org is an aggregator: an Astro landing at `/`, plus each project's docs
 * built in its own repo and mounted as a static tree under `/packages/<name>/`.
 * That means every surface lives on one origin at its own base path, so
 * **every cross-project link must be absolute**. A relative href would resolve
 * against the local base and produce `/packages/journey/packages/react-inputs/`.
 *
 * This module is imported from `astro.config.mjs` under Node, so it must never
 * import CSS or a component.
 */

/** Canonical origin. Override for a staging deploy (e.g. https://web.rxova.org). */
export const RXOVA_ORIGIN = process.env.RXOVA_ORIGIN ?? 'https://rxova.org'

export type ProjectId =
  'overlock' | 'journey' | 'react-inputs' | 'use-everywhere' | 'ts-extended-errors'

export interface Project {
  id: ProjectId
  /** Display name, used in the header, the switcher and the landing cards. */
  label: string
  /** Path the aggregator mounts this project's docs at. Leading and trailing slash. */
  mount: `/${string}/`
  tagline: string
  repo: string
  /** The package a newcomer should install first. */
  npm: string
  /** npm package names, most prominent first. */
  packages: string[]
}

/**
 * Display order, shared by the landing's project rail and the docs switcher.
 *
 * overlock sits last deliberately. It is the newest of these and the only one
 * that is not a library you import — a CLI and a CI gate — so leading the list
 * with it put the least representative project in front of every reader of
 * every surface.
 */
export const PROJECTS: readonly Project[] = [
  {
    id: 'journey',
    label: 'journey',
    mount: '/packages/journey/',
    tagline: 'Declarative journey graphs for non-linear UI flows.',
    repo: 'https://github.com/rxova/journey',
    npm: 'https://www.npmjs.com/package/@rxova/journey-core',
    packages: ['@rxova/journey-core', '@rxova/journey-react', '@rxova/journey-devtools-bridge'],
  },
  {
    id: 'react-inputs',
    label: 'react-inputs',
    mount: '/packages/react-inputs/',
    tagline: 'The tricky React inputs, done right.',
    repo: 'https://github.com/rxova/react-inputs',
    npm: 'https://www.npmjs.com/package/@rxova/react-inputs',
    packages: [
      '@rxova/react-inputs',
      '@rxova/react-intl-currency-input',
      '@rxova/react-rating-input',
      '@rxova/react-otp-input',
      '@rxova/react-password-input',
      '@rxova/react-phone-input',
      '@rxova/react-date-input',
      '@rxova/react-time-input',
      '@rxova/react-tags-input',
      '@rxova/react-file-input',
    ],
  },
  {
    id: 'use-everywhere',
    label: 'use-everywhere',
    mount: '/packages/use-everywhere/',
    tagline: 'State and messages that exist in every tab, window, and worker.',
    repo: 'https://github.com/rxova/use-everywhere',
    npm: 'https://www.npmjs.com/package/use-everywhere',
    packages: ['use-everywhere', '@use-everywhere/core'],
  },
  {
    id: 'ts-extended-errors',
    label: 'ts-extended-errors',
    mount: '/packages/ts-extended-errors/',
    tagline: 'Typed, serializable errors that survive a JSON round trip.',
    repo: 'https://github.com/rxova/ts-extended-errors',
    npm: 'https://www.npmjs.com/package/ts-extended-errors',
    packages: ['ts-extended-errors'],
  },
  {
    id: 'overlock',
    label: 'overlock',
    mount: '/packages/overlock/',
    tagline: 'A deterministic gate on test integrity in a git patch.',
    repo: 'https://github.com/rxova/overlock',
    npm: 'https://www.npmjs.com/package/overlock',
    packages: ['overlock'],
  },
] as const

export function getProject(id: ProjectId): Project {
  const project = PROJECTS.find((p) => p.id === id)
  if (!project) throw new Error(`[@rxova/brand] unknown project id: ${id}`)
  return project
}

/**
 * Every rxova repo a changelog entry can be about — the published projects plus
 * the ones that ship no package.
 *
 * `PROJECTS` deliberately stays what it is: the things with docs, an npm package
 * and a landing card. But "we rebuilt the deploy pipeline" is exactly the kind of
 * progress `/changelog` exists to record, and it belongs to `rxova-website`, which
 * is not a project and never will be. Validating changelog entries against
 * `PROJECTS` would make those entries unrepresentable.
 *
 * Order is display order for the changelog's repo filter: projects first, then
 * infrastructure.
 */
export const REPOS = [
  ...PROJECTS.map((p) => ({ id: p.id, label: p.label, repo: p.repo, project: true as const })),
  {
    id: 'rxova-website',
    label: 'Website',
    repo: 'https://github.com/rxova/rxova-website',
    project: false as const,
  },
  {
    id: 'brand',
    label: 'Brand',
    repo: 'https://github.com/rxova/rxova-website/tree/main/packages/brand',
    project: false as const,
  },
] as const

export type RepoId = (typeof REPOS)[number]['id']

/** The ids only, for schema validation — see packages/website-schemas. */
export const REPO_IDS: readonly RepoId[] = REPOS.map((r) => r.id)

export function getRepo(id: RepoId): (typeof REPOS)[number] {
  const found = REPOS.find((r) => r.id === id)
  if (!found) throw new Error(`[@rxova/brand] unknown repo id: ${id}`)
  return found
}

/** Absolute URL to a project's docs root. */
export function docsUrl(id: ProjectId): string {
  return `${RXOVA_ORIGIN}${getProject(id).mount}`
}

/** Absolute URL to a path on the umbrella site, e.g. `/privacy`. */
export function siteUrl(path = '/'): string {
  return `${RXOVA_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`
}

/**
 * Absolute canonical URL for a *page* on the umbrella site.
 *
 * Trailing slash, always — which is the whole reason this is not `siteUrl`.
 * rxova.org is published as a directory-style tree on GitHub Pages, so `/blog`
 * answers 301 and only `/blog/` answers 200. A self-referencing canonical naming
 * the redirecting form points a crawler at a URL that does not serve the page,
 * which is the one thing a canonical must never do. `siteUrl` stays as it is:
 * a nav link may follow a redirect, a canonical may not.
 *
 * Pages only. Assets keep their exact path and want `siteUrl`.
 */
export function canonicalUrl(path = '/'): string {
  const rooted = path.startsWith('/') ? path : `/${path}`
  return `${RXOVA_ORIGIN}${rooted.endsWith('/') ? rooted : `${rooted}/`}`
}

/**
 * Which project a page belongs to, inferred from Astro's `BASE_URL`.
 *
 * Component overrides can't be given props, so the shared chrome works this out
 * for itself rather than making every repo declare it twice (once in the
 * Starlight config, once in the override). Returns `undefined` on a standalone
 * build where the base is `/` and there is nothing to infer from — the current
 * marker is simply omitted, which is correct off the aggregator.
 */
export function projectFromBase(base: string): ProjectId | undefined {
  const normalised = base.endsWith('/') ? base : `${base}/`
  return PROJECTS.find((p) => p.mount === normalised)?.id
}
