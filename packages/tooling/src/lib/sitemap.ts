// Sitemap and robots.txt for the assembled tree.
//
// rxova.org is stitched together from independently built trees, and that is
// exactly why this has to run here rather than in any one of them. Each Starlight
// docs site already emits its own `sitemap-index.xml` covering its own subtree —
// but nothing pointed at those files, so Google never discovered them: it knew
// about ~25 URLs while roughly 275 sat in sitemaps no crawler had a path to.
//
// So this module writes the two files only the aggregator can write:
//
//   sitemap-index.xml  <- the root index: every project's sitemap, plus the pages below
//   sitemap-pages.xml  <- the pages nobody else covers (landing, /blog, /updates)
//   robots.txt         <- points crawlers at the root index
//
// A project that ships its own sitemap is referenced, not re-crawled: its tree is
// its own business and it knows its own lastmod. A project that ships none — the
// page-bundle sites, which are composed here — gets swept into sitemap-pages.xml
// instead, so adding one still costs no code change.

import { readdir, readFile, writeFile, access } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'

import { parse } from 'parse5'

import { attribute, element, walkNodes } from './html.ts'
import type { Source } from './registry.ts'

/**
 * Canonical origin, matching `RXOVA_ORIGIN` in @rxova/brand.
 *
 * Not imported from there: brand ships TypeScript source with no build step, and
 * these scripts run under bare `node` in CI. Kept as an env override for the same
 * reason brand has one — a staging deploy needs its sitemaps to point at itself.
 */
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

/**
 * The URL path a built file is served at, given the tree is directory-style.
 *
 *   index.html        -> /
 *   about/index.html  -> /about/
 *   404.html          -> /404.html   (filtered out before it gets here)
 */
export function urlForFile(relPath: string): string {
  const path = posix(relPath)
  if (path === 'index.html') return '/'
  if (path.endsWith('/index.html')) return `/${path.slice(0, -'index.html'.length)}`
  return `/${path}`
}

/**
 * Whether a built page belongs in a sitemap.
 *
 * Two kinds of page do not. A `noindex` page is one we have explicitly asked not
 * to be indexed (/privacy, /terms) and listing it in a sitemap contradicts that to
 * a crawler's face. A redirect stub is not a destination at all — the sitemap
 * should carry its target, which it does under the target's own entry.
 */
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
 * The `lastmod` for a built page, or undefined when the page does not claim one.
 *
 * Read from what the page says about itself — the `dateModified` or
 * `datePublished` in its JSON-LD, else its first `<time datetime>`. Deliberately
 * NOT the file's mtime: every file in a CI build is written seconds before this
 * runs, so mtime would stamp every URL on the site with today's date on every
 * deploy. A sitemap that claims the whole site changed daily is worse than one
 * with no dates at all — Google learns the field is noise and discounts it.
 *
 * `lastmod` is optional per URL, so a page with nothing honest to say simply
 * omits it. That is why this returns undefined rather than a fallback.
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
      // A page carrying unparseable JSON-LD is a separate problem; it must not
      // take the sitemap down with it.
    }
  }
  const time = html.match(/<time[^>]+datetime=["'](\d{4}-\d{2}-\d{2})/i)
  return time?.[1]
}

/**
 * The sitemap files a project's own `sitemap-index.xml` names, as paths in this
 * tree.
 *
 * A sitemap index may not list another sitemap index. sitemaps.org says so and
 * Google enforces it by ignoring the nested file outright — along with every URL
 * underneath it. That is exactly the shape this repo would otherwise publish the
 * moment a project shipped a sitemap: `@astrojs/sitemap` always emits an index
 * plus one or more `sitemap-N.xml` urlsets, never a bare urlset, so referencing
 * the child index from the root index buries a project's whole tree one level
 * too deep and it is read by nothing.
 *
 * Flattening one level here is what keeps both halves true: each project still
 * owns its own URLs and its own lastmods, and the root index stays the single
 * level of indirection a crawler actually follows.
 *
 * A child that turns out to be a plain `<urlset>` is referenced as it stands —
 * it is already a leaf, and descending into it would only find pages.
 *
 * Every path is confined to the project's own mount. A sitemap may only claim
 * URLs at or below its own location, so a `<loc>` reaching outside is invalid
 * whatever it meant; this is the one point where a producer's build output gets
 * to name a file in the root index, which makes it the place to check rather
 * than assume.
 */
export function childSitemapPaths(xml: string, mount: string): string[] {
  if (!/<sitemapindex(?=[\s/>])/i.test(xml)) return [`${mount}/${SITEMAP_INDEX}`]

  const prefix = `${mount}/`
  const paths: string[] = []
  for (const [, raw] of xml.matchAll(/<loc>\s*([^<]*?)\s*<\/loc>/gi)) {
    const loc = unescapeXml(raw ?? '')
    // Only the path is ours to read. The child was built by its own repo against
    // its own `site`, which under a staging deploy is not the origin we are
    // writing — so the origin is re-derived when the index is written, and a
    // `<loc>` that is already a bare path works the same way.
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
      // `.html` only, deliberately. A docs site may also serve a `.md` twin of
      // every page for agents (see llms.ts); listing both would offer a
      // crawler two URLs for one page, which is the textbook duplicate-content
      // signal. Sitemaps are for indexable pages — the markdown is for readers
      // that ask for it by name.
      if (!entry.isFile() || !entry.name.endsWith('.html')) continue
      // The 404 page is served *as* a 404. Listing it invites Google to index the
      // error page itself, which is a classic way to get a "soft 404" flagged.
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
 * The llms.txt pointer is a COMMENT, not a directive.
 *
 * `Llms-txt:` is not part of the robots.txt grammar, and a field a strict parser
 * does not know is a parse error it may take the whole file down over — a bad
 * trade for a file whose real job is keeping the site crawlable. Agents find
 * /llms.txt at its well-known path without being told; the line is here so a
 * human reading robots.txt learns the index exists.
 */
/**
 * The AI crawlers and readers this site is explicitly open to.
 *
 * `User-agent: *` above already permits every one of them, so this group grants
 * nothing new today. It is here for the two things the wildcard cannot do.
 *
 * `Google-Extended` and `Applebot-Extended` are not crawlers at all — nothing
 * fetches under those names. They are usage controls, read only from robots.txt,
 * that decide whether pages Google and Apple already have may be used to ground
 * an AI answer. robots.txt is the only place that consent can be expressed, so a
 * site that means to be quotable has to say it here or not at all.
 *
 * And group selection in robots.txt is most-specific-wins, not additive: an
 * agent named below reads only this group and ignores `*` entirely. That is the
 * durable half. These are documentation libraries whose whole purpose is to be
 * found by somebody asking a model how to solve the problem they solve; naming
 * the agents means a `Disallow` added to `*` later — for a search page, a
 * preview build, anything — cannot quietly take that away as a side effect.
 *
 * The same rule is the maintenance cost, and it points the other way too: a
 * `Disallow` that is genuinely meant for everyone has to be repeated in this
 * group, because these agents will never see the one under `*`.
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

/**
 * Write the root sitemap index, the catch-all urlset and robots.txt into `outDir`.
 *
 * Returns what it wrote so the caller can log it and the tests can assert on it
 * without re-parsing XML.
 */
export async function writeSitemaps(
  outDir: string,
  sources: (Pick<Source, 'mount'> & Partial<Pick<Source, 'kind'>>)[],
  origin = RXOVA_ORIGIN,
): Promise<{ pages: Page[]; children: string[] }> {
  const children: string[] = []
  const skipDirs = new Set<string>()

  for (const source of sources) {
    // A showcase is not a page set. Storybook builds one app shell plus
    // `iframe.html`, the canvas frame every story renders inside — documents with
    // no crawlable prose, whose content arrives from JavaScript and whose routing
    // lives in a query string. Neither is a destination, and submitting them from
    // a domain with no authority yet spends crawl budget on thin pages to no end.
    //
    // Excluded by `kind` rather than by path, so any future non-documentation
    // surface is excluded by existing simply as itself. Note this only stops us
    // *offering* the URLs: the landing links to Storybook, so a crawler can still
    // reach it. Keeping it out of the index outright would need a `noindex` from
    // the Storybook build, which is that repo's to add.
    if (source.kind === 'storybook') {
      skipDirs.add(posix(source.mount))
      continue
    }
    const indexPath = join(outDir, source.mount, SITEMAP_INDEX)
    if (!(await exists(indexPath))) continue

    const paths = childSitemapPaths(await readFile(indexPath, 'utf8'), posix(source.mount))
    // An index naming nothing we can use is not a sitemap as far as this tree is
    // concerned, so the project falls through to the sweep below — the same
    // tolerance a project shipping no sitemap at all already gets. Deferring to
    // it regardless would drop its pages out of the site's sitemaps entirely,
    // which is the one outcome worse than listing them here.
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
