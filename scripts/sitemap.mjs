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

import { attribute, walkNodes } from './html.mjs'

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

async function exists(p) {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

const posix = (p) => p.split(sep).join('/')

const escapeXml = (value) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/**
 * The URL path a built file is served at, given the tree is directory-style.
 *
 *   index.html        -> /
 *   about/index.html  -> /about/
 *   404.html          -> /404.html   (filtered out before it gets here)
 */
export function urlForFile(relPath) {
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
export function isIndexable(html) {
  let indexable = true
  walkNodes(parse(html), (node) => {
    if (node.tagName !== 'meta') return
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
export function lastmodFor(html) {
  const ld = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>(.*?)<\/script>/gis)]
  for (const [, body] of ld) {
    try {
      const data = JSON.parse(body.replace(/\\u003c/gi, '<'))
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

async function indexablePages(outDir, skipDirs) {
  const found = []
  async function visit(dir) {
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
      // every page for agents (see scripts/llms.mjs); listing both would offer a
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

const urlset = (pages, origin) =>
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  pages
    .map(({ path, lastmod }) => {
      const stamp = lastmod ? `<lastmod>${escapeXml(lastmod)}</lastmod>` : ''
      return `  <url><loc>${escapeXml(origin + path)}</loc>${stamp}</url>\n`
    })
    .join('') +
  '</urlset>\n'

const sitemapIndex = (files, origin) =>
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
const robotsTxt = (origin) =>
  [
    'User-agent: *',
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
export async function writeSitemaps(outDir, sources, origin = RXOVA_ORIGIN) {
  const children = []
  const skipDirs = new Set()

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
    if (!(await exists(join(outDir, source.mount, SITEMAP_INDEX)))) continue
    children.push(`${posix(source.mount)}/${SITEMAP_INDEX}`)
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
