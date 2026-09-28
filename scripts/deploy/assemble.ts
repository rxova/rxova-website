#!/usr/bin/env node
// Assembles rxova.org from build artifacts. Usage: node assemble.ts [artifacts] [_site]
// Mounts come from sources.json; each artifact is copied as built, plus the analytics beacon.

import { cp, mkdir, access, rm, readFile, writeFile, readdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { errorMessage } from '@rxova/ts-utils'

import { withAnalytics } from '../lib/analytics.ts'
import { loadRedirects, writeRedirects } from '../lib/redirects.ts'
import { loadRegistry, enabledSources, type Registry, type Source } from '../lib/registry.ts'
import { writeSitemaps, RXOVA_ORIGIN } from '../lib/sitemap.ts'
import { writeLlms } from '../lib/llms.ts'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')

async function exists(p: string): Promise<boolean> {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

async function copyInto(src: string, dest: string, { label }: { label: string }): Promise<boolean> {
  if (!(await exists(src))) return false
  await mkdir(dest, { recursive: true })
  await cp(src, dest, { recursive: true })
  console.log(`  ✓ ${label}: ${src} -> ${dest}`)
  return true
}

async function htmlFiles(root: string): Promise<string[]> {
  const found: string[] = []
  async function visit(dir: string): Promise<void> {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) await visit(path)
      else if (entry.isFile() && entry.name.endsWith('.html')) found.push(path)
    }
  }
  await visit(root)
  return found
}

async function addAnalytics(dir: string, token: string, source: Source) {
  let counted = 0
  for (const file of await htmlFiles(dir)) {
    const html = await readFile(file, 'utf8')
    const updated = withAnalytics(html, token)
    if (updated === html) continue
    await writeFile(file, updated)
    counted++
  }
  console.log(`  ✓ ${source.id}: analytics added to ${String(counted)} page(s)`)
}

/** What the deploy passes besides the tree: the analytics token, absent outside production. */
export interface AssembleOptions {
  analyticsToken?: string | undefined
}

/**
 * Copies the landing and every enabled project's artifact into one tree.
 * Throws (never exits) on a missing artifact, so a broken build stops the deploy.
 */
export async function assemble(
  config: Registry,
  artifactsDir: string,
  outDir: string,
  { analyticsToken }: AssembleOptions = {},
) {
  // Fresh output tree.
  await rm(outDir, { recursive: true, force: true })
  await mkdir(outDir, { recursive: true })

  console.log(`Assembling site -> ${outDir}`)

  // 1. Landing at root (required).
  const landing = config.landing ?? { artifact: 'landing', mount: '.' }
  const landingSrc = join(artifactsDir, landing.artifact)
  const landingOk = await copyInto(landingSrc, join(outDir, landing.mount), {
    label: 'landing',
  })
  if (!landingOk) {
    throw new Error(`landing artifact missing at ${landingSrc}`)
  }

  // 2. Each enabled docs source under its mount. Disabled projects are absent here,
  // so a missing artifact means a failed build: fail rather than publish a hole.
  const missing = []
  for (const s of enabledSources(config)) {
    const src = join(artifactsDir, s.artifact)
    if (!(await exists(src))) {
      missing.push(`${s.id} (expected ${src})`)
      continue
    }
    await copyInto(src, join(outDir, s.mount), { label: s.id })
    if (analyticsToken) await addAnalytics(join(outDir, s.mount), analyticsToken, s)
  }

  if (missing.length > 0) {
    throw new Error(
      `enabled project(s) with no artifact:\n  - ${missing.join('\n  - ')}\n` +
        'Either the build job failed, or the project should be disabled in sources.json.',
    )
  }

  // 3. Redirect stubs for retired URLs, written before the sitemap is taken
  //    because a stub is a redirect, not a destination, and must not be listed.
  await writeRedirects(outDir, config.redirects ?? {}, config.origin ?? RXOVA_ORIGIN)

  // 4. The agent-facing index, after mounting: it probes each project's own
  //    llms.txt and links to the docs root of any that has none.
  await writeLlms(outDir, enabledSources(config), config.origin ?? RXOVA_ORIGIN)

  // 5. Sitemaps last: they describe the finished tree, so everything that will
  //    ever be in it has to be there already.
  await writeSitemaps(outDir, enabledSources(config), config.origin ?? RXOVA_ORIGIN)

  console.log('Done.')
}

/* v8 ignore start -- entry point; the deploy workflow is what runs it, the tests import `assemble` */
if (import.meta.main) {
  const [, , artifactsDir = 'artifacts', outDir = '_site'] = process.argv
  const config = {
    ...loadRegistry(join(repoRoot, 'sources.json')),
    redirects: await loadRedirects(join(repoRoot, 'redirects.json')),
  }
  const analyticsToken = process.env.CLOUDFLARE_WEB_ANALYTICS_TOKEN || undefined
  assemble(config, artifactsDir, outDir, { analyticsToken }).catch((err) => {
    console.error(`ERROR: ${errorMessage(err)}`)
    process.exit(1)
  })
}
/* v8 ignore stop */
