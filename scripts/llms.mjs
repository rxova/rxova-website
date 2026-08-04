// The root llms.txt for the assembled tree.
//
// https://llmstxt.org — a plain-markdown index a coding agent reads to find out
// what a site offers, at a well-known path, without spending a context window on
// rendered HTML.
//
// This belongs here for the same reason `sitemap.mjs` does: it is a file only the
// aggregator can write. Each project publishes its own `llms.txt` under its mount
// describing its own API; nothing points at those, so an agent that lands on
// rxova.org has no path to them. This module writes the one index that does.
//
// A project that ships an `llms.txt` is linked to it. A project that ships none is
// linked to its docs root instead — the same tolerance `writeSitemaps` has for a
// project with no sitemap of its own. That is deliberate: it means this repo and a
// project repo can ship in either order, and a project lights up the moment it
// adds the file, with no change here.

import { access, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { RXOVA_ORIGIN } from './sitemap.mjs'

/** The well-known filename, both here and under each project's mount. */
export const LLMS_FILE = 'llms.txt'

/**
 * The site's own summary. Written here rather than imported from @rxova/brand for
 * the reason sitemap.mjs documents: brand ships TypeScript source with no build
 * step, and these scripts run under bare `node` in CI.
 */
const SUMMARY = [
  'Small, focused TypeScript libraries for the hard parts of the browser.',
  'Each is zero- or few-dependency, typed, accessible, and documented with a',
  'reference generated from its own source.',
]

async function exists(p) {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

/**
 * Where to send an agent for one project: its own llms.txt when it publishes one,
 * otherwise its docs root.
 *
 * Returns the URL and whether it is the richer target, so the caller can say so in
 * the note — an agent choosing between two links deserves to know one is an index
 * built for it and the other is a landing page it will have to crawl.
 */
export async function projectEntry(outDir, source, origin) {
  const url = `${origin}${source.base}`
  return (await exists(join(outDir, source.mount, LLMS_FILE)))
    ? { url: `${url}${LLMS_FILE}`, indexed: true }
    : { url, indexed: false }
}

const link = ({ label, url, note }) => `- [${label}](${url})${note ? `: ${note}` : ''}`

/**
 * Build the document. Pure, so the shape is testable without a tree on disk.
 *
 * `projects` and `sites` are already-resolved entries: the caller has done the
 * filesystem probing, which is the only part that needs a real directory.
 */
export function llmsIndex({ projects, sites }, origin) {
  const lines = ['# Rxova', '', ...SUMMARY.map((l) => `> ${l}`), '']

  if (projects.length > 0) {
    lines.push('## Libraries', '')
    for (const p of projects) lines.push(link(p))
    lines.push('')
  }

  if (sites.length > 0) {
    lines.push('## Also on this site', '')
    for (const s of sites) lines.push(link(s))
    lines.push('')
  }

  lines.push(
    '## Notes',
    '',
    `- Every link above is markdown or HTML served from ${origin}.`,
    '- A library linked to its own `llms.txt` publishes a full index there, and',
    '  serves every documentation page as raw markdown by appending `.md` to its URL.',
    '',
  )

  return lines.join('\n')
}

/**
 * Write the root llms.txt into `outDir`.
 *
 * Returns what it wrote so the caller can log it and the tests can assert on it
 * without re-parsing the document.
 */
export async function writeLlms(outDir, sources, origin = RXOVA_ORIGIN) {
  const projects = []
  const sites = []

  for (const source of sources) {
    // Storybook is a rendered component explorer: there is no prose for an agent
    // to read, and its own project's llms.txt is the useful destination instead.
    if (source.kind === 'storybook') continue

    const { url } = await projectEntry(outDir, source, origin)
    const entry = {
      // The id, not a prettier label: it is the URL segment and the npm scope,
      // which is what an agent needs to act on. The human-facing labels live in
      // @rxova/brand's PROJECTS, which bare `node` cannot import (see above).
      label: source.id,
      url,
      note: source.landing?.blurb,
    }
    ;(source.kind === 'site' ? sites : projects).push(entry)
  }

  const sortByLabel = (a, b) => a.label.localeCompare(b.label, 'en')
  projects.sort(sortByLabel)
  sites.sort(sortByLabel)

  const body = llmsIndex({ projects, sites }, origin)
  await writeFile(join(outDir, LLMS_FILE), body)

  const indexed = projects.filter((p) => p.url.endsWith(LLMS_FILE)).length
  console.log(
    `  ✓ ${LLMS_FILE}: ${projects.length} librar${projects.length === 1 ? 'y' : 'ies'}` +
      ` (${indexed} with an index of their own) + ${sites.length} site(s)`,
  )
  return { projects, sites }
}
