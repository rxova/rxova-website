/**
 * The pre-merge gate for `content/`.
 *
 * rxova-website renders this content and validates it again through Astro's
 * content collections, so this script is not the only gate — but it is the one
 * that runs *here*, on the pull request that introduces the problem, rather than
 * failing a deploy in another repo an hour later.
 *
 * It shares its schema with the apps that render it (`packages/website-schemas`), so the two
 * cannot disagree about the plain fields. It then checks what Astro expresses with
 * `reference()` and `image()` and a plain Node script would otherwise miss:
 *
 *   - every `authors:` id has a file in content/authors
 *   - every `cover:` path resolves on disk
 *   - every `![](…)` a body embeds resolves on disk
 *
 * which makes this gate strictly stronger than the build gate, not a lossy copy.
 *
 * Reports every problem in one pass. A validator that stops at the first error
 * turns "five posts have the wrong date format" into five round trips.
 *
 * `validateContent` is exported and returns its errors rather than exiting, so the
 * tests can assert on them; the CLI at the bottom owns the exit code. Same shape as
 * rxova-website's `scripts/assemble.mjs`, for the same reason.
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
} from '../packages/website-schemas/src/index.ts'
// The registry itself, which @rxova/website-schemas deliberately cannot see: it is
// published, and reaching into the design system for REPO_IDS made its entry point
// unresolvable once installed. The check lives here, where both are on disk.
import { REPO_IDS } from '../packages/brand/src/sites.ts'

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

/**
 * Split `---\n...\n---\n` off the front of a markdown file.
 *
 * Deliberately not gray-matter: the only thing needed here is the YAML block, and
 * a dependency that also caches, excerpts and supports four other delimiters is
 * more surface than the job has.
 */
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
 * The relative image paths a markdown body embeds.
 *
 * Astro resolves these through the same asset pipeline as `cover` — optimising
 * them, hashing them and rewriting the src to sit under the surface's base — but
 * only at build time, and only in another job. A typo'd path is worth catching on
 * the pull request that writes it, which is the whole reason this gate exists.
 *
 * Code is stripped before scanning. A post about markdown that quotes an image in
 * a fenced block is showing the syntax, not embedding a file, and a validator that
 * cannot tell the difference makes writing about markdown impossible.
 *
 * Only relative paths come back. Absolute ones, `/`-rooted ones and remote URLs are
 * all passthrough as far as Astro is concerned — there is no local file to check,
 * and guessing at one would reject links that work.
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

/**
 * The two surfaces, each self-contained.
 *
 * Authors are duplicated between them on purpose: each package validates its own
 * registry, so a typo'd byline still fails, and the worst a divergence costs is a
 * stale bio on one page. Sharing them would have meant a third package for four
 * lines of frontmatter.
 */
export const SURFACES = [
  { pkg: 'packages/blog', entries: 'posts', label: 'post' },
  { pkg: 'packages/updates', entries: 'updates', label: 'update' },
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

  function report(rel: string, result: z.SafeParseReturnType<unknown, unknown>): void {
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

  // `authors` is already known to be a non-empty string array — the zod parse ran
  // first and this is only reached on success, so the defensive shape guards this
  // used to carry were unreachable.
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
   * The filename prefix and the frontmatter must be the same instant.
   *
   * Not a nicety: the prefix exists so the directory sorts the way the site does,
   * and the moment the two disagree it is sorting by something that is not true.
   *
   * UTC throughout — a local offset near midnight would otherwise disagree with its
   * own filename for reasons that take ten minutes to work out.
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

    // Both surfaces render markdown through Astro, which resolves an embedded
    // `![](./…)` through the same asset pipeline as a cover — so both can break the
    // same way, and neither finds out until the build.
    for (const src of bodyImages(doc.body)) checkResolves(doc, 'image', src)

    if (isPost) {
      const post = parsed.data as z.infer<typeof postFile>

      // Astro resolves `cover` through image(), which only runs at build time. A
      // broken path is worth catching on the pull request that writes it.
      if (post.cover) checkResolves(doc, 'cover', post.cover)

      // Alt text describes a cover, so alt text with no cover describes nothing.
      // Always a mistake — a deleted cover whose alt survived it, or alt text
      // written before the image was added — and silent, because the renderer
      // reads `coverAlt` only inside the `cover &&` branch.
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
    posts: count('packages/blog', 'posts'),
    updates: count('packages/updates', 'updates'),
    // Duplicated across the two surfaces; counting one is the honest number.
    authors: count('packages/blog', 'authors'),
  }
}

/**
 * The CLI body, with its output injected so a test can read it.
 *
 * Returns the exit code rather than calling `process.exit`, which keeps the only
 * genuinely untestable line in the file down to the `import.meta.filename` guard
 * below — a two-line wrapper whose behaviour is "run the program".
 */
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

export const defaultContentRoot = (): string => join(dirname(fileURLToPath(import.meta.url)), '..')

/* v8 ignore next 3 -- the entry-point guard; `pnpm validate:content` is what runs it */
if (import.meta.filename === process.argv[1]) {
  process.exit(runCli(defaultContentRoot()))
}
