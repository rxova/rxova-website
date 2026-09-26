// Writes sitemap-index.xml (every project's sitemap), sitemap-pages.xml (pages no project
// sitemap covers) and robots.txt for the assembled tree.

import { readdir, readFile, writeFile, access } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'

import { parse } from 'parse5'

import { attribute, element, walkNodes } from './html.ts'
import type { Source } from './registry.ts'

/** Canonical origin; mirrors `RXOVA_ORIGIN` in @rxova/brand, which depends on this package. */
export const RXOVA_ORIGIN = process.env.RXOVA_ORIGIN ?? 'https://rxova.org'

/** The file a Starlight/Astro subtree publishes, and the name of our root index. */
export const SITEMAP_INDEX = 'sitemap-index.xml'

/** The urlset holding everything not covered by a project's own sitemap. */
export const SITEMAP_PAGES = 'sitemap-pages.xml'

async function exists(p: string): Promise<boolean> {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

const posix = (p: string): string => p.split(sep).join('/')

const escapeXml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const XML_ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" } as const

/** The inverse, for reading a `<loc>` out of a sitemap somebody else wrote. */
const unescapeXml = (value: string): string =>
  // The pattern names exactly the keys above, so every match has a replacement.
  value.replace(
    /&(amp|lt|gt|quot|apos);/g,
    (_whole: string, name: keyof typeof XML_ENTITIES) => XML_ENTITIES[name],
  )

/** The URL path a built file is served at in the directory-style tree (a/index.html -> /a/). */
export function urlForFile(relPath: string): string {
  const path = posix(relPath)
  if (path === 'index.html') return '/'
  if (path.endsWith('/index.html')) return `/${path.slice(0, -'index.html'.length)}`
  return `/${path}`
}

/** Whether a built page belongs in a sitemap: not if it is `noindex` or a redirect stub. */
export function isIndexable(html: string): boolean {
  let indexable = true
  walkNodes(parse(html), (node) => {
    if (!element('meta')(node)) return
    if (attribute(node, 'http-equiv')?.toLowerCase() === 'refresh') indexable = false
    if (
      attribute(node, 'name')?.toLowerCase() === 'robots' &&
      /\bnoindex\b/i.test(attribute(node, 'content') ?? '')
    ) {
      indexable = false
    }
  })
  return indexable
}

/**
 * A page's `lastmod` from its JSON-LD dates or first `<time datetime>`, else undefined.
 * Never the file mtime, which in CI would stamp every URL with the deploy date.
 */
export function lastmodFor(html: string): string | undefined {
  const ld = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>(.*?)<\/script>/gis)]
  for (const [, body] of ld) {
    try {
      const data = JSON.parse((body ?? '').replace(/\\u003c/gi, '<'))
      for (const node of Array.isArray(data) ? data : [data]) {
        const stamp = node?.dateModified ?? node?.datePublished
        if (typeof stamp === 'string' && /^\d{4}-\d{2}-\d{2}/.test(stamp)) return stamp.slice(0, 10)
      }
    } catch {
      // Unparseable JSON-LD must not take the sitemap down with it.
    }
  }
  const time = html.match(/<time[^>]+datetime=["'](\d{4}-\d{2}-\d{2})/i)
  return time?.[1]
}

/**
 * The sitemaps a project's `sitemap-index.xml` names, flattened one level (an index may not
 * list an index), as paths confined to the project's mount; a plain `<urlset>` is kept as is.
 */
export function childSitemapPaths(xml: string, mount: string): string[] {
  if (!/<sitemapindex(?=[\s/>])/i.test(xml)) return [`${mount}/${SITEMAP_INDEX}`]

  const prefix = `${mount}/`
  const paths: string[] = []
  for (const [, raw] of xml.matchAll(/<loc>\s*([^<]*?)\s*<\/loc>/gi)) {
    const loc = unescapeXml(raw ?? '')
    // Keep only the path: the child's origin may differ (e.g. staging), so the origin
    // is re-derived when the index is written.
    let path
    try {
      path = new URL(loc).pathname
    } catch {
      path = loc
    }
    path = path.replace(/^\/+/, '')
    if (!path.startsWith(prefix) || path.split('/').includes('..')) continue
    if (!paths.includes(path)) paths.push(path)
  }
  return paths
}

interface Page {
  path: string
  lastmod: string | undefined
}

async function indexablePages(outDir: string, skipDirs: Set<string>): Promise<Page[]> {
  const found: Page[] = []
  async function visit(dir: string): Promise<void> {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) {
        // A project with its own sitemap owns its subtree; descending would list
        // its pages twice, once here and once under its own index.
        if (skipDirs.has(posix(relative(outDir, path)))) continue
        await visit(path)
        continue
      }
      // `.html` only: listing the `.md` twins served for agents would be duplicate
      // content.
      if (!entry.isFile() || !entry.name.endsWith('.html')) continue
      // Listing the 404 page invites a "soft 404" flag.
      if (entry.name === '404.html') continue
      const html = await readFile(path, 'utf8')
      if (!isIndexable(html)) continue
      found.push({ path: urlForFile(relative(outDir, path)), lastmod: lastmodFor(html) })
    }
  }
  await visit(outDir)
  return found.sort((a, b) => a.path.localeCompare(b.path))
}

const urlset = (pages: Page[], origin: string): string =>
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  pages
    .map(({ path, lastmod }) => {
      const stamp = lastmod ? `<lastmod>${escapeXml(lastmod)}</lastmod>` : ''
      return `  <url><loc>${escapeXml(origin + path)}</loc>${stamp}</url>\n`
    })
    .join('') +
  '</urlset>\n'

const sitemapIndex = (files: string[], origin: string): string =>
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  files.map((f) => `  <sitemap><loc>${escapeXml(`${origin}/${f}`)}</loc></sitemap>\n`).join('') +
  '</sitemapindex>\n'

/**
 * The robots.txt llms.txt pointer is a comment, not a directive: `Llms-txt:` is not robots.txt
 * grammar and a strict parser may reject the whole file over it.
 */
/**
 * AI crawlers explicitly allowed. A named group is read instead of `*`, so a `Disallow` meant
 * for everyone must be repeated here; `Google-Extended`/`Applebot-Extended` are consent flags.
 */
export const AI_USER_AGENTS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-User',
  'Claude-SearchBot',
  'Google-Extended',
  'Applebot-Extended',
  'PerplexityBot',
  'Perplexity-User',
  'meta-externalagent',
  'Amazonbot',
  'Bytespider',
  'CCBot',
  'cohere-ai',
  'DuckAssistBot',
  'MistralAI-User',
  'YouBot',
]

const robotsTxt = (origin: string): string =>
  [
    'User-agent: *',
    'Allow: /',
    '',
    '# Named explicitly, not because the group above forbids them, but because',
    '# Google-Extended and Applebot-Extended are grants that exist nowhere else,',
    '# and because a named group is read INSTEAD of *, so a Disallow added there',
    '# later cannot revoke this by accident. Add such a Disallow here too.',
    ...AI_USER_AGENTS.map((agent) => `User-agent: ${agent}`),
    'Allow: /',
    '',
    `Sitemap: ${origin}/${SITEMAP_INDEX}`,
    '',
    `# Agent-readable index of this site: ${origin}/llms.txt`,
    '',
  ].join('\n')

/** Writes the root sitemap index, the catch-all urlset and robots.txt; returns what it wrote. */
export async function writeSitemaps(
  outDir: string,
  sources: (Pick<Source, 'mount'> & Partial<Pick<Source, 'kind'>>)[],
  origin = RXOVA_ORIGIN,
): Promise<{ pages: Page[]; children: string[] }> {
  const children: string[] = []
  const skipDirs = new Set<string>()

  for (const source of sources) {
    // Storybook has no crawlable prose, so it is never offered (excluded by `kind`);
    // keeping it out of the index entirely needs a `noindex` from its own build.
    if (source.kind === 'storybook') {
      skipDirs.add(posix(source.mount))
      continue
    }
    const indexPath = join(outDir, source.mount, SITEMAP_INDEX)
    if (!(await exists(indexPath))) continue

    const paths = childSitemapPaths(await readFile(indexPath, 'utf8'), posix(source.mount))
    // An index naming nothing usable falls through to the sweep below, like a project
    // with no sitemap, so its pages are still listed.
    if (paths.length === 0) continue

    children.push(...paths)
    skipDirs.add(posix(source.mount))
  }

  const pages = await indexablePages(outDir, skipDirs)
  await writeFile(join(outDir, SITEMAP_PAGES), urlset(pages, origin))

  // Pages first: it is the one a human opens to check the aggregate looks right.
  const files = [SITEMAP_PAGES, ...children.sort()]
  await writeFile(join(outDir, SITEMAP_INDEX), sitemapIndex(files, origin))
  await writeFile(join(outDir, 'robots.txt'), robotsTxt(origin))

  console.log(`  ✓ sitemaps: ${pages.length} page(s) + ${children.length} project sitemap(s)`)
  return { pages, children }
}
