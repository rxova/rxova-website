// Legacy-URL redirects, materialised as static stub documents.
//
// GitHub Pages serves files, not rules: there is no .htaccess, no _redirects, no
// edge function. The only redirect it can express is one written into a document,
// so each entry in redirects.json becomes a small page carrying
// <meta http-equiv="refresh"> for browsers and <link rel="canonical"> for crawlers.
// Google documents that pair as an accepted redirect signal.
//
// This exists because the old /docs/devtool/* URLs are still the ones Google holds
// for this site. They 404 today, so the crawl history and any inbound links behind
// them are being thrown away rather than handed to the pages that replaced them.

import { readFile, mkdir, writeFile, access } from 'node:fs/promises'
import { join, dirname } from 'node:path'

import { z } from 'zod'

/** A rooted, directory-style path — the only shape the assembled tree can serve. */
const FROM_PATTERN = /^\/(?:[\w.-]+\/)+$/

const toPath = z.string().regex(/^\//, 'must be a rooted path, e.g. /packages/journey/bridge/')

// Keys are checked below rather than with a key schema: zod reports a rejected
// record key as a bare "Invalid key in record", which names neither the offending
// path nor what was wrong with it — no use to whoever has to fix the file.
const redirectsFile = z
  .object({
    $comment: z.unknown().optional(),
    redirects: z.record(z.string(), toPath).default({}),
  })
  .strict()

class RedirectError extends Error {
  constructor(message) {
    super(`redirects.json: ${message}`)
    this.name = 'RedirectError'
  }
}

/** Read and validate redirects.json. Throws `RedirectError` on anything malformed. */
export async function loadRedirects(file) {
  let raw
  try {
    raw = JSON.parse(await readFile(file, 'utf8'))
  } catch (err) {
    throw new RedirectError(`could not be read or parsed — ${err.message}`)
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

async function exists(p) {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

/** Where a rooted URL path is served from in the built tree. */
const fileFor = (outDir, path) =>
  path.endsWith('/') ? join(outDir, path, 'index.html') : join(outDir, path)

export function stubDocument(to, origin) {
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

const escapeHtml = (value) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/**
 * Write a stub for every redirect into the assembled tree.
 *
 * Refuses on a target that does not exist, and on a source path that would land on
 * top of a real page. Both are the same judgement the rest of the assembler makes:
 * a broken redirect published silently is worse than a deploy that stops and says
 * which entry is wrong.
 */
export async function writeRedirects(outDir, redirects, origin) {
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
