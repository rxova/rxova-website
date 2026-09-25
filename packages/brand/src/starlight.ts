/**
 * Shared Starlight configuration for the rxova docs sites.
 *
 * Each project's `astro.config.mjs` supplies only what is genuinely its own —
 * its sidebar, its extra plugins — and spreads the rest from here, so the three
 * doc sites cannot drift apart in the ways that made them feel like three
 * unrelated products.
 *
 * Imported from `astro.config.mjs` under Node: no CSS, no component imports.
 *
 * The return type is structural rather than Starlight's own `StarlightUserConfig`.
 * Spreading into `starlight({ ... })` still type-checks the merged object at the
 * call site, and this way a Starlight minor release cannot break every consumer
 * at once over a type-only change.
 */

import { RXOVA_ORIGIN, getProject, type ProjectId } from './sites.ts'

export interface SharedStarlightOptions {
  /** Which project's docs this site is. */
  project: ProjectId
  /** Starlight sidebar config — the one thing every site defines itself. */
  sidebar: unknown[]
  /** Extra stylesheets, appended after the brand ones so they win. */
  customCss?: string[]
  /** Extra Starlight component overrides, merged over the shared ones. */
  components?: Record<string, string>
  /** Path under the repo root that holds the docs site, for the edit link. */
  editLinkBase?: string
  /**
   * Build body-only documentation for rxova-website to place in its global
   * shell. Starlight's search, sidebar and page navigation remain page UI; only
   * the umbrella footer is omitted.
   */
  pageComponent?: boolean
}

export function sharedStarlightConfig({
  project,
  sidebar,
  customCss = [],
  components = {},
  editLinkBase = 'apps/docs',
  pageComponent = false,
}: SharedStarlightOptions) {
  const self = getProject(project)

  return {
    title: self.label,
    description: self.tagline,
    // One origin, one tab icon. Each site must have this file in `public/` —
    // Starlight resolves `favicon` against the site's own static directory, so
    // it cannot come from this package.
    favicon: '/favicon.svg',

    // No `logo` here on purpose: the SiteTitle override renders the mark from
    // this package's own assets, so adopting the shared chrome does not also
    // mean copying an image into three repos and keeping it in sync.

    social: [
      { icon: 'github' as const, label: 'GitHub', href: self.repo },
      { icon: 'npm' as const, label: 'npm', href: self.npm },
    ],

    editLink: {
      baseUrl: `${self.repo}/edit/main/${editLinkBase}/`,
    },

    // Order matters: fonts, then tokens+mapping, then per-site overrides.
    customCss: ['@rxova/brand/fonts.css', '@rxova/brand/starlight.css', ...customCss],

    components: {
      // The rxova mark + project wordmark, with the mark linking back to the
      // umbrella site. This is the only "you are inside rxova.org" affordance
      // on a docs page, so it ships shared rather than per-repo.
      SiteTitle: '@rxova/brand/components/SiteTitle.astro',
      // Appends the cross-project switcher to the social icons. Without it the
      // three docs sites are three islands under one domain.
      SocialIcons: '@rxova/brand/components/SocialIcons.astro',
      // Starlight's default footer (pagination, edit link, last updated) plus
      // the shared four-column site footer beneath it.
      ...(!pageComponent ? { Footer: '@rxova/brand/components/Footer.astro' } : {}),
      // Starlight's own picker, plus a resync when a page is restored from the
      // back/forward cache — without it, changing the theme on one rxova.org
      // surface and pressing Back leaves the restored page on the old theme.
      ThemeSelect: '@rxova/brand/components/ThemeSelect.astro',
      ...components,
    },

    head: [
      {
        tag: 'meta' as const,
        attrs: { property: 'og:image', content: `${RXOVA_ORIGIN}/og/${project}.png` },
      },
      {
        tag: 'meta' as const,
        attrs: { name: 'twitter:card', content: 'summary_large_image' },
      },
      // What this project *is*, in the vocabulary a crawler already parses.
      //
      // Every field is read from PROJECTS, so a project that changes its tagline
      // or adds a package updates its structured data with it — the failure this
      // avoids is the usual one for hand-written JSON-LD, which is that it
      // describes the site as it was when someone last remembered to edit it.
      //
      // Emitted on every page of the docs rather than only the root: Starlight
      // has no "site index only" hook, and repeating an identical
      // SoftwareSourceCode across a subtree is well-formed — each page really is
      // documentation for that one piece of software.
      {
        tag: 'script' as const,
        attrs: { type: 'application/ld+json' },
        content: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'SoftwareSourceCode',
          name: self.label,
          description: self.tagline,
          url: `${RXOVA_ORIGIN}${self.mount}`,
          codeRepository: self.repo,
          programmingLanguage: 'TypeScript',
          runtimePlatform: 'Node.js',
          license: 'https://opensource.org/licenses/MIT',
          author: { '@type': 'Person', name: 'Jonatan Kruszewski' },
        }).replace(/</g, '\\u003c'),
      },
    ],

    // Pagefind ships with Starlight and replaces the third-party search plugin
    // journey was carrying.
    pagefind: true,

    sidebar,
  }
}
