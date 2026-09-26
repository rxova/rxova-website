/**
 * Shared Starlight configuration for the rxova docs sites; each site adds only its sidebar and
 * extras. Imported under Node (no CSS or components) and typed structurally, not as Starlight's.
 */

import { RXOVA_ORIGIN, getProject, type ProjectId } from '@rxova/brand'

export interface SharedStarlightOptions {
  /** Which project's docs this site is. */
  project: ProjectId
  /** Starlight sidebar config — the one thing every site defines itself. */
  sidebar: unknown[]
  /** Extra stylesheets, appended after the shared ones so they win. */
  customCss?: string[]
  /** Extra Starlight component overrides, merged over the shared ones. */
  components?: Record<string, string>
  /** Path under the repo root that holds the docs site, for the edit link. */
  editLinkBase?: string
  /** Build body-only docs for rxova-website's shell: Starlight's page UI stays, the footer goes. */
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
    // One origin, one tab icon. Each site must have this file in `public/`: Starlight resolves
    // `favicon` against the site's own static directory.
    favicon: '/favicon.svg',

    // No `logo` on purpose: the SiteTitle override renders the mark from @rxova/brand's assets.

    social: [
      { icon: 'github' as const, label: 'GitHub', href: self.repo },
      { icon: 'npm' as const, label: 'npm', href: self.npm },
    ],

    editLink: {
      baseUrl: `${self.repo}/edit/main/${editLinkBase}/`,
    },

    // Order matters: fonts, then tokens+mapping, then per-site overrides.
    customCss: ['@rxova/brand/fonts.css', '@rxova/astro-ui/styles/starlight.css', ...customCss],

    components: {
      // The rxova mark (linking back to the umbrella site) plus the project wordmark.
      SiteTitle: '@rxova/astro-ui/starlight/SiteTitle.astro',
      // Appends the cross-project switcher to the social icons. Without it the
      // three docs sites are three islands under one domain.
      SocialIcons: '@rxova/astro-ui/starlight/SocialIcons.astro',
      // Starlight's default footer (pagination, edit link, last updated) plus
      // the shared four-column site footer beneath it.
      ...(!pageComponent ? { Footer: '@rxova/astro-ui/starlight/Footer.astro' } : {}),
      // Starlight's own picker, plus a resync when a page is restored from the bfcache.
      ThemeSelect: '@rxova/astro-ui/starlight/ThemeSelect.astro',
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
      // SoftwareSourceCode JSON-LD built from PROJECTS, on every docs page: Starlight has no
      // "site index only" hook.
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
