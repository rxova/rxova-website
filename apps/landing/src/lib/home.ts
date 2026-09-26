/** The homepage's data: its structured data, the featured project and the standards' icons. */
import { siteUrl } from '@rxova/brand'

import type { MAINTAINER as Maintainer } from './about'
import type { LandingProject } from './projects'

/** The project the showcase opens on: chosen, not whichever sorts first. */
export const FEATURED_PROJECT_ID = 'ts-extended-errors'

/** Where `id` sits in `projects`; throws, so a renamed project fails the build instead of emptying the stage. */
export function featuredIndex(
  projects: readonly { id: string }[],
  id = FEATURED_PROJECT_ID,
): number {
  const index = projects.findIndex((p) => p.id === id)
  if (index === -1) {
    throw new Error(
      `[landing] FEATURED_PROJECT_ID "${id}" is not a project. ` +
        `Known: ${projects.map((p) => p.id).join(', ')}.`,
    )
  }
  return index
}

/** The `Organization` behind the npm scope, the GitHub org and this domain, with the projects it lists. */
export function organizationJsonLd(
  projects: readonly LandingProject[],
  maintainer: typeof Maintainer,
  projectList: string,
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Rxova',
    url: siteUrl('/'),
    logo: siteUrl('/rxova-logo-1024.png'),
    description: `Independent TypeScript libraries for problems that are harder than they look: ${projectList}.`,
    founder: { '@type': 'Person', name: maintainer.name },
    sameAs: [maintainer.org, ...maintainer.links.map((l) => l.href)],
    hasPart: projects.map((p) => ({
      '@type': 'SoftwareSourceCode',
      name: p.label,
      description: p.tagline,
      url: siteUrl(p.mount),
      codeRepository: p.repo,
      programmingLanguage: 'TypeScript',
      license: 'https://opensource.org/licenses/MIT',
    })),
  }
}

/** JSON for an inline `<script>`, with `<` escaped so no string in it can close the element. */
export const scriptJson = (data: unknown): string => JSON.stringify(data).replace(/</g, '\\u003c')

/** One stroked glyph per `Standard.id`; decorative, since the label beside each carries the meaning. */
export const STANDARD_ICONS: Record<string, string> = {
  // A target: one thing, aimed at deliberately.
  'one-pain-point': '<circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3.2" />',
  // A shield: built to be depended on.
  'production-grade':
    '<path d="M12 3.4 5 6.1v5.2c0 4 2.9 7.2 7 9.3 4.1-2.1 7-5.3 7-9.3V6.1L12 3.4Z" />',
  // An empty crate: nothing rides along.
  'zero-dependencies':
    '<path d="M12 3.3 20 7.6v8.8L12 20.7 4 16.4V7.6L12 3.3Z" /><path d="M4 7.6 12 12l8-4.4M12 12v8.7" />',
  // A ticked box: the cases that matter, checked.
  tested:
    '<rect x="4" y="4" width="16" height="16" rx="3.2" /><path d="m8.4 12.1 2.7 2.7 4.5-5.2" />',
  // A prompt: the toolchain is a terminal, not a wizard.
  'modern-toolchain':
    '<rect x="3" y="4.6" width="18" height="14.8" rx="2.6" /><path d="m7.6 10.2 2.8 2.6-2.8 2.6M13.2 15.4h4" />',
  // A branch: every commit builds.
  'clean-ci':
    '<circle cx="7" cy="5.6" r="2.3" /><circle cx="7" cy="18.4" r="2.3" /><circle cx="17" cy="5.6" r="2.3" /><path d="M7 7.9v8.2" /><path d="M17 7.9v1.7a4 4 0 0 1-4 4H9.3" />',
  // A reply: someone is on the other end.
  'answered-quickly': '<path d="M20 11.9a7 7 0 0 1-10.4 6.1L5 19.4l1.4-4.3A7 7 0 1 1 20 11.9Z" />',
}
