// Legacy-URL redirects as static stubs (GitHub Pages has no redirect rules): each entry
// becomes a page with <meta http-equiv="refresh"> plus <link rel="canonical">.

import { readFile, mkdir, writeFile, access } from 'node:fs/promises'
import { join, dirname } from 'node:path'

import { z } from 'zod'

import { errorMessage } from './errors.ts'

/** A rooted, directory-style path — the only shape the assembled tree can serve. */
const FROM_PATTERN = /^\/(?:[\w.-]+\/)+$/

const toPath = z.string().regex(/^\//, 'must be a rooted path, e.g. /packages/journey/bridge/')

// Keys are checked below, not by a key schema: zod's "Invalid key in record" names
// neither the offending path nor the problem.
const redirectsFile = z
  .object({
    $comment: z.unknown().optional(),
    redirects: z.record(z.string(), toPath).default({}),
  })
  .strict()

class RedirectError extends Error {
  constructor(message: string) {
    super(`redirects.json: ${message}`)
    this.name = 'RedirectError'
  }
}

/** Read and validate redirects.json. Throws `RedirectError` on anything malformed. */
export async function loadRedirects(file: string): Promise<Record<string, string>> {
  let raw: unknown
  try {
    raw = JSON.parse(await readFile(file, 'utf8'))
  } catch (err) {
    throw new RedirectError(`could not be read or parsed — ${errorMessage(err)}`)
  }

  const parsed = redirectsFile.safeParse(raw)
  if (!parsed.success) {
    throw new RedirectError(
      'is invalid:\n' +
        parsed.error.issues
          .map((i) => `  ${i.path.length ? i.path.join('.') : '(file)'} — ${i.message}`)
          .join('\n'),
    )
  }

  for (const [from, to] of Object.entries(parsed.data.redirects)) {
    if (!FROM_PATTERN.test(from)) {
      throw new RedirectError(
        `"${from}" must be a rooted directory path, e.g. /docs/devtool/examples/`,
      )
    }
    if (from === to) throw new RedirectError(`"${from}" redirects to itself`)
    // A chain would need two hops to resolve, and the second hop is written by the
    // same pass — so it may not exist yet when a crawler follows the first.
    if (parsed.data.redirects[to]) {
      throw new RedirectError(`"${from}" points at "${to}", which is itself a redirect`)
    }
  }

  return parsed.data.redirects
}

async function exists(p: string): Promise<boolean> {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

/** Where a rooted URL path is served from in the built tree. */
const fileFor = (outDir: string, path: string): string =>
  path.endsWith('/') ? join(outDir, path, 'index.html') : join(outDir, path)

export function stubDocument(to: string, origin: string): string {
  const target = escapeHtml(to)
  const canonical = escapeHtml(new URL(to, origin).href)
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Redirecting…</title>
    <link rel="canonical" href="${canonical}" />
    <meta http-equiv="refresh" content="0; url=${target}" />
  </head>
  <body>
    <p>This page has moved to <a href="${target}">${target}</a>.</p>
  </body>
</html>
`
}

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/**
 * Writes a stub for every redirect into the assembled tree. Throws on a missing target
 * or on a source path that is a real page.
 */
export async function writeRedirects(
  outDir: string,
  redirects: Record<string, string>,
  origin: string,
): Promise<string[]> {
  const broken = []
  const colliding = []

  for (const [from, to] of Object.entries(redirects)) {
    if (!(await exists(fileFor(outDir, to)))) broken.push(`${from} -> ${to}`)
    if (await exists(fileFor(outDir, from))) colliding.push(from)
  }

  if (broken.length > 0) {
    throw new RedirectError(
      `redirect target(s) missing from the assembled site:\n  - ${broken.join('\n  - ')}\n` +
        'Either the target moved again, or the project that owns it is disabled.',
    )
  }
  if (colliding.length > 0) {
    throw new RedirectError(
      `redirect source(s) are real pages on the site:\n  - ${colliding.join('\n  - ')}\n` +
        'A redirect may only stand in for a URL that no longer exists.',
    )
  }

  for (const [from, to] of Object.entries(redirects)) {
    const file = fileFor(outDir, from)
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, stubDocument(to, origin))
  }

  const count = Object.keys(redirects).length
  if (count > 0) console.log(`  ✓ redirects: ${count} legacy URL(s)`)
  return Object.keys(redirects)
}
