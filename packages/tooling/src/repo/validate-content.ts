/**
 * Pre-merge gate for `content/`: the shared schema plus authors, covers and body images resolving
 * on disk. Reports every problem in one pass and returns errors; the CLI owns the exit code.
 */

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'

import { parse as parseYaml } from 'yaml'
import { z } from 'zod'

import {
  postBase,
  updateBase,
  authorBase,
  parseEntryFilename,
  isoToStamp,
  unknownRepos,
  AUTHOR_FILENAME,
} from '../../../website-schemas/src/index.ts'
// REPO_IDS lives in brand, which the published @rxova/website-schemas must not import,
// so the repo check happens here.
import { REPO_IDS } from '../../../brand/src/sites.ts'

/** On-disk shapes: what Astro expresses with reference() and image(), as strings. */
const postFile = postBase.extend({
  authors: z.array(z.string().min(1)).nonempty(),
  cover: z.string().min(1).optional(),
})

const updateFile = updateBase.extend({
  authors: z.array(z.string().min(1)).nonempty(),
})

const ENTRY_HINT =
  'name must be `YYYY-MM-DDTHHMMSS-<slug>.md` (UTC, to the second), ' +
  'slug lowercase letters, digits and dashes'

const AUTHOR_HINT = 'name must be `<id>.md`, lowercase letters, digits and dashes'

interface Doc {
  /** Path relative to the content root, for error messages. */
  readonly rel: string
  readonly abs: string
  readonly slug: string
  /** `2026-07-27T143005` from the filename; empty for an author, which has none. */
  readonly stamp: string
  readonly data: unknown
  /** Everything after the frontmatter block, for the embedded-image check. */
  readonly body: string
}

type Parsed = { slug: string; stamp: string }

/** Splits `---\n...\n---\n` off the front of a markdown file (only the YAML block is needed). */
function frontmatter(source: string): { data: unknown; body: string } | { error: string } {
  if (!source.startsWith('---')) {
    return { error: 'no frontmatter block — the file must start with `---`' }
  }
  const end = source.indexOf('\n---', 3)
  if (end === -1) return { error: 'frontmatter block is never closed' }
  try {
    // `\n---` plus the rest of that line; the body is whatever follows it.
    const bodyStart = source.indexOf('\n', end + 1)
    return {
      data: parseYaml(source.slice(3, end)) ?? {},
      body: bodyStart === -1 ? '' : source.slice(bodyStart + 1),
    }
  } catch (err) {
    return { error: `frontmatter is not valid YAML — ${(err as Error).message}` }
  }
}

/**
 * The relative image paths a markdown body embeds, ignoring code spans and fences.
 * Absolute, `/`-rooted and remote URLs are skipped: there is no local file to check.
 */
export function bodyImages(body: string): string[] {
  const prose = body
    .replace(/^([`~]{3,})[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, '')
    .replace(/`[^`\n]*`/g, '')

  // The `<…>` form is the one that may contain spaces — which is the entire reason
  // it exists, so it cannot share the bare form's "up to the first space" rule.
  return [...prose.matchAll(/!\[[^\]]*\]\(\s*(?:<([^>]*)>|([^)\s]+))/g)]
    .map((m) => m[1] ?? m[2]!)
    .filter((src) => !/^([a-z][a-z0-9+.-]*:|\/|#)/i.test(src))
}

/** The filename contract lives in the schema package, shared with the renderer. */
const parseEntry = (name: string): Parsed | null => {
  const p = parseEntryFilename(name)
  return p ? { slug: p.slug, stamp: p.stamp } : null
}

const parseAuthor = (name: string): Parsed | null => {
  const m = AUTHOR_FILENAME.exec(name)
  return m ? { slug: m[1]!, stamp: '' } : null
}

/** The two surfaces, each self-contained: each validates its own duplicated author registry. */
export const SURFACES = [
  { pkg: 'apps/blog', entries: 'posts', label: 'post' },
  { pkg: 'apps/updates', entries: 'updates', label: 'update' },
] as const

export function validateContent(repoRoot: string): string[] {
  return SURFACES.flatMap((s) => validateSurface(join(repoRoot, s.pkg), s))
}

function validateSurface(
  packageRoot: string,
  surface: { pkg: string; entries: string; label: string },
): string[] {
  const errors: string[] = []
  const fail = (rel: string, message: string) => errors.push(`${rel}: ${message}`)

  function readDir(dir: string, parse: (name: string) => Parsed | null, hint: string): Doc[] {
    const abs = join(packageRoot, dir)
    if (!existsSync(abs)) return []

    const docs: Doc[] = []
    for (const name of readdirSync(abs).sort()) {
      const file = join(abs, name)
      const rel = `${surface.pkg}/${dir}/${name}`
      if (!statSync(file).isFile()) continue
      if (!name.endsWith('.md')) {
        fail(rel, 'only .md files belong here')
        continue
      }

      const parsed = parse(name)
      if (!parsed) {
        fail(rel, hint)
        continue
      }

      const fm = frontmatter(readFileSync(file, 'utf8'))
      if ('error' in fm) {
        fail(rel, fm.error)
        continue
      }
      docs.push({ rel, abs: file, ...parsed, data: fm.data, body: fm.body })
    }
    return docs
  }

  function report(rel: string, result: z.ZodSafeParseResult<unknown>): void {
    if (result.success) return
    for (const issue of result.error.issues) {
      const path = issue.path.length > 0 ? issue.path.join('.') : '(root)'
      fail(rel, `${path} — ${issue.message}`)
    }
  }

  function checkUniqueSlugs(docs: Doc[], label: string): void {
    const seen = new Map<string, string>()
    for (const doc of docs) {
      const first = seen.get(doc.slug)
      // Two files with the same slug would be two entries fighting over one URL,
      // and which one wins depends on directory order. Catch it here.
      if (first) fail(doc.rel, `${label} slug "${doc.slug}" is already used by ${first}`)
      else seen.set(doc.slug, doc.rel)
    }
  }

  // --- authors -------------------------------------------------------------

  const authorDocs = readDir('authors', parseAuthor, AUTHOR_HINT)
  const authorIds = new Set<string>()

  for (const doc of authorDocs) {
    report(doc.rel, authorBase.safeParse(doc.data))
    authorIds.add(doc.slug)
  }

  if (authorDocs.length === 0) {
    errors.push(
      `${surface.pkg}/authors: no authors defined — every entry needs a byline that resolves`,
    )
  }

  // Only reached after a successful zod parse, so `authors` is a non-empty string array.
  function checkAuthors(doc: Doc, authors: readonly string[]): void {
    for (const id of authors) {
      if (!authorIds.has(id)) {
        fail(
          doc.rel,
          `authors — no such author "${id}"; expected a file at ${surface.pkg}/authors/${id}.md` +
            (authorIds.size > 0 ? ` (have: ${[...authorIds].sort().join(', ')})` : ''),
        )
      }
    }
  }

  /**
   * The filename prefix and the frontmatter must be the same instant (in UTC), so the
   * directory sorts the way the site does.
   */
  function checkPrefix(doc: Doc, date: Date, field: string): void {
    const want = isoToStamp(date)
    if (want !== doc.stamp) {
      fail(
        doc.rel,
        `filename says ${doc.stamp} but ${field} is ${date.toISOString()} — ` +
          `rename to ${want}-${doc.slug}.md, or fix ${field}`,
      )
    }
  }

  // --- entries -------------------------------------------------------------

  const docs = readDir(surface.entries, parseEntry, ENTRY_HINT)
  checkUniqueSlugs(docs, surface.label)

  const isPost = surface.label === 'post'

  /** A path in frontmatter or a body is relative to the entry that wrote it. */
  function checkResolves(doc: Doc, field: string, src: string): void {
    const target = resolve(dirname(doc.abs), src)
    if (!existsSync(target)) {
      fail(doc.rel, `${field} — "${src}" does not resolve (looked for ${target})`)
    }
  }

  for (const doc of docs) {
    const parsed = (isPost ? postFile : updateFile).safeParse(doc.data)
    report(doc.rel, parsed)
    if (!parsed.success) continue

    checkAuthors(doc, parsed.data.authors)

    // Astro resolves an embedded `![](./…)` like a cover on both surfaces, so check
    // it here rather than at build time.
    for (const src of bodyImages(doc.body)) checkResolves(doc, 'image', src)

    if (isPost) {
      const post = parsed.data as z.infer<typeof postFile>

      // Astro resolves `cover` through image(), which only runs at build time. A
      // broken path is worth catching on the pull request that writes it.
      if (post.cover) checkResolves(doc, 'cover', post.cover)

      // Alt text without a cover is always a mistake, and silent: the renderer reads
      // `coverAlt` only inside the `cover &&` branch.
      if (post.coverAlt && !post.cover) {
        fail(doc.rel, 'coverAlt — set without a cover; add `cover:` or drop the alt text')
      }

      if (post.updatedDate && post.updatedDate < post.pubDate) {
        fail(doc.rel, 'updatedDate is earlier than pubDate')
      }

      checkPrefix(doc, post.pubDate, 'pubDate')
    } else {
      const update = parsed.data as z.infer<typeof updateFile>

      const unknown = unknownRepos(update.repos, REPO_IDS)
      if (unknown.length > 0) {
        fail(
          doc.rel,
          `repos — no such repo ${unknown.map((r) => `"${r}"`).join(', ')}; ` +
            `expected one of ${[...REPO_IDS].join(', ')} (see REPOS in packages/brand/src/sites.ts)`,
        )
      }

      checkPrefix(doc, update.date, 'date')
    }
  }

  return errors
}

/** Counts, for the CLI's success line. Exported so a test can assert on them. */
export function countContent(repoRoot: string): {
  posts: number
  updates: number
  authors: number
} {
  const count = (pkg: string, dir: string) => {
    const abs = join(repoRoot, pkg, dir)
    return existsSync(abs) ? readdirSync(abs).filter((n) => n.endsWith('.md')).length : 0
  }
  return {
    posts: count('apps/blog', 'posts'),
    updates: count('apps/updates', 'updates'),
    // Duplicated across the two surfaces; counting one is the honest number.
    authors: count('apps/blog', 'authors'),
  }
}

/** The CLI body, with its output injected so a test can read it; returns the exit code. */
export function runCli(
  contentRoot: string,
  out: { log: (m: string) => void; error: (m: string) => void } = console,
): number {
  const errors = validateContent(contentRoot)

  if (errors.length > 0) {
    out.error(`content validation failed — ${errors.length} problem(s):\n`)
    for (const e of errors) out.error(`  ✗ ${e}`)
    out.error('\nSee docs/CONTENT.md for the frontmatter contract.')
    return 1
  }

  const { posts, updates, authors } = countContent(contentRoot)
  out.log(`content ok — ${posts} post(s), ${updates} update(s), ${authors} author(s)`)
  return 0
}

export const defaultContentRoot = (): string =>
  join(dirname(fileURLToPath(import.meta.url)), '../../../..')

/* v8 ignore next 3 -- the entry-point guard; `pnpm validate:content` is what runs it */
if (import.meta.filename === process.argv[1]) {
  process.exit(runCli(defaultContentRoot()))
}
