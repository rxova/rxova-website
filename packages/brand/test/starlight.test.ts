/**
 * The Starlight config every rxova docs site spreads from.
 *
 * The docs sites live in other repos and read this over npm, so its output is a
 * contract: each module path must resolve through this package's exports, and
 * each option must change only what it documents.
 */

import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { PROJECTS, RXOVA_ORIGIN, getProject, type ProjectId } from '../src/sites.ts'
import { sharedStarlightConfig } from '../src/starlight.ts'

const packageRoot = new URL('../', import.meta.url)
const manifest = JSON.parse(readFileSync(new URL('package.json', packageRoot), 'utf8')) as {
  name: string
  exports: Record<string, string>
}

/** Resolves `@rxova/brand/<subpath>` through the manifest's exports, as a consumer would. */
const resolveExport = (specifier: string): string | undefined => {
  const subpath = `.${specifier.slice(manifest.name.length)}`
  for (const [key, target] of Object.entries(manifest.exports)) {
    if (key === subpath) return fileURLToPath(new URL(target, packageRoot))
    const [prefix, suffix] = key.split('*')
    if (suffix !== undefined && prefix && subpath.startsWith(prefix) && subpath.endsWith(suffix)) {
      const rest = subpath.slice(prefix.length, subpath.length - suffix.length)
      return fileURLToPath(new URL(target.replace('*', rest), packageRoot))
    }
  }
  return undefined
}

const SHARED_COMPONENTS = ['SiteTitle', 'SocialIcons', 'Footer', 'ThemeSelect']

describe('sharedStarlightConfig', () => {
  const sidebar = [{ label: 'Guides', autogenerate: { directory: 'guides' } }]

  it.each(PROJECTS.map((p) => p.id))('describes %s from its brand entry', (id: ProjectId) => {
    const self = getProject(id)
    const config = sharedStarlightConfig({ project: id, sidebar })

    expect(config.title).toBe(self.label)
    expect(config.description).toBe(self.tagline)
    expect(config.social).toEqual([
      { icon: 'github', label: 'GitHub', href: self.repo },
      { icon: 'npm', label: 'npm', href: self.npm },
    ])
    expect(config.head[0]).toEqual({
      tag: 'meta',
      attrs: { property: 'og:image', content: `${RXOVA_ORIGIN}/og/${id}.png` },
    })
  })

  it('returns the documented defaults for a site that passes only its sidebar', () => {
    const config = sharedStarlightConfig({ project: 'journey', sidebar })

    expect(config).toMatchObject({
      favicon: '/favicon.svg',
      editLink: { baseUrl: 'https://github.com/rxova/journey/edit/main/apps/docs/' },
      customCss: ['@rxova/brand/fonts.css', '@rxova/brand/starlight.css'],
      components: {
        SiteTitle: '@rxova/brand/components/SiteTitle.astro',
        SocialIcons: '@rxova/brand/components/SocialIcons.astro',
        Footer: '@rxova/brand/components/Footer.astro',
        ThemeSelect: '@rxova/brand/components/ThemeSelect.astro',
      },
      pagefind: true,
    })
    expect(Object.keys(config.components)).toEqual(SHARED_COMPONENTS)
    expect(config).not.toHaveProperty('logo')
  })

  it('passes the sidebar through untouched', () => {
    expect(sharedStarlightConfig({ project: 'journey', sidebar }).sidebar).toBe(sidebar)
  })

  it('appends extra stylesheets after the brand ones, so they win', () => {
    const config = sharedStarlightConfig({
      project: 'journey',
      sidebar,
      customCss: ['./src/site.css', './src/extra.css'],
    })
    expect(config.customCss).toEqual([
      '@rxova/brand/fonts.css',
      '@rxova/brand/starlight.css',
      './src/site.css',
      './src/extra.css',
    ])
  })

  it('merges extra components over the shared ones', () => {
    const config = sharedStarlightConfig({
      project: 'journey',
      sidebar,
      components: { Footer: './src/Footer.astro', Hero: './src/Hero.astro' },
    })
    expect(config.components).toEqual({
      SiteTitle: '@rxova/brand/components/SiteTitle.astro',
      SocialIcons: '@rxova/brand/components/SocialIcons.astro',
      Footer: './src/Footer.astro',
      ThemeSelect: '@rxova/brand/components/ThemeSelect.astro',
      Hero: './src/Hero.astro',
    })
  })

  it('points the edit link at a custom docs directory', () => {
    const config = sharedStarlightConfig({ project: 'overlock', sidebar, editLinkBase: 'docs' })
    expect(config.editLink.baseUrl).toBe('https://github.com/rxova/overlock/edit/main/docs/')
  })

  // A page component is placed in rxova-website's own shell, which has the footer.
  it('drops only the site footer when building a page component', () => {
    const page = sharedStarlightConfig({ project: 'journey', sidebar, pageComponent: true })
    const full = sharedStarlightConfig({ project: 'journey', sidebar, pageComponent: false })

    expect(page.components).not.toHaveProperty('Footer')
    expect(Object.keys(page.components)).toEqual(SHARED_COMPONENTS.filter((c) => c !== 'Footer'))
    expect(full.components).toHaveProperty('Footer', '@rxova/brand/components/Footer.astro')

    expect({ ...page, components: {} }).toEqual({ ...full, components: {} })
  })

  it('still lets a page component supply a footer of its own', () => {
    const config = sharedStarlightConfig({
      project: 'journey',
      sidebar,
      pageComponent: true,
      components: { Footer: './src/Footer.astro' },
    })
    expect(config.components.Footer).toBe('./src/Footer.astro')
  })

  it('asks for a large social card', () => {
    const { head } = sharedStarlightConfig({ project: 'journey', sidebar })
    expect(head[1]).toEqual({
      tag: 'meta',
      attrs: { name: 'twitter:card', content: 'summary_large_image' },
    })
  })

  it.each(PROJECTS.map((p) => p.id))('emits SoftwareSourceCode JSON-LD for %s', (id) => {
    const self = getProject(id)
    const script = sharedStarlightConfig({ project: id, sidebar }).head[2]

    expect(script?.tag).toBe('script')
    expect(script?.attrs).toEqual({ type: 'application/ld+json' })
    // Escaped so no string in the data can close the <script> element early.
    expect(script?.content).not.toContain('<')
    expect(JSON.parse(script?.content ?? '')).toEqual({
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
    })
  })

  // Consumers import these by string; a path that stops resolving breaks every docs site.
  it('names only stylesheets and components this package exports', () => {
    const config = sharedStarlightConfig({ project: 'journey', sidebar })
    const paths = [...config.customCss, ...Object.values(config.components)]

    for (const path of paths) {
      expect(path.startsWith(`${manifest.name}/`), path).toBe(true)
      const file = resolveExport(path)
      expect(file, path).toBeDefined()
      expect(existsSync(file ?? ''), path).toBe(true)
    }
  })

  it('throws for a project id brand does not know', () => {
    expect(() => sharedStarlightConfig({ project: 'nope' as ProjectId, sidebar })).toThrow(
      'unknown project id: nope',
    )
  })
})
