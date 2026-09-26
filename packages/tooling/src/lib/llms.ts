// The root llms.txt (https://llmstxt.org) for the assembled tree, linking each project's
// own llms.txt, or its docs root when it ships none.

import { access, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import type { Source } from './registry.ts'
import { RXOVA_ORIGIN } from './sitemap.ts'

/** The well-known filename, both here and under each project's mount. */
export const LLMS_FILE = 'llms.txt'

/** The site's summary, inlined because bare `node` in CI cannot import @rxova/brand's TS source. */
const SUMMARY = [
  'Small, focused TypeScript libraries for the hard parts of the browser.',
  'Each is zero- or few-dependency, typed, accessible, and documented with a',
  'reference generated from its own source.',
]

async function exists(p: string): Promise<boolean> {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

/** The part of a registry source the index reads. */
export type LlmsSource = Pick<Source, 'id' | 'kind' | 'base' | 'mount'> & {
  landing?: { blurb?: string }
}

export interface LlmsEntry {
  label: string
  url: string
  note?: string
}

/** An agent's entry for one project: its llms.txt (`indexed`) if published, else its docs root. */
export async function projectEntry(
  outDir: string,
  source: Pick<LlmsSource, 'base' | 'mount'>,
  origin: string,
): Promise<{ url: string; indexed: boolean }> {
  const url = `${origin}${source.base}`
  return (await exists(join(outDir, source.mount, LLMS_FILE)))
    ? { url: `${url}${LLMS_FILE}`, indexed: true }
    : { url, indexed: false }
}

const link = ({ label, url, note }: LlmsEntry): string =>
  `- [${label}](${url})${note ? `: ${note}` : ''}`

/** Builds the document from already-resolved entries; pure, so testable without a tree on disk. */
export function llmsIndex(
  { projects, sites }: { projects: LlmsEntry[]; sites: LlmsEntry[] },
  origin: string,
): string {
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

/** Writes the root llms.txt into `outDir` and returns the entries it wrote. */
export async function writeLlms(
  outDir: string,
  sources: LlmsSource[],
  origin = RXOVA_ORIGIN,
): Promise<{ projects: LlmsEntry[]; sites: LlmsEntry[] }> {
  const projects: LlmsEntry[] = []
  const sites: LlmsEntry[] = []

  for (const source of sources) {
    // Storybook is a rendered component explorer: there is no prose for an agent
    // to read, and its own project's llms.txt is the useful destination instead.
    if (source.kind === 'storybook') continue

    const { url } = await projectEntry(outDir, source, origin)
    const entry: LlmsEntry = {
      // The id (URL segment and npm scope), since brand's human-facing labels
      // cannot be imported under bare `node`.
      label: source.id,
      url,
      note: source.landing?.blurb,
    }
    ;(source.kind === 'site' ? sites : projects).push(entry)
  }

  const sortByLabel = (a: LlmsEntry, b: LlmsEntry) => a.label.localeCompare(b.label, 'en')
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
