#!/usr/bin/env node
// Assemble the combined rxova.org site from downloaded build artifacts.
//
// Usage: node scripts/assemble.mjs [artifactsDir=artifacts] [outDir=_site]
//
// Layout of `artifactsDir` — one folder per artifact:
//   artifacts/landing/           <- Astro `site/dist`, downloaded from this run
//   artifacts/docs-journey/      <- journey docs, extracted from release content-journey
//   artifacts/docs-react-inputs/ <- react-inputs docs, from release content-react-inputs
//
// The landing is a workflow artifact; the docs folders are put there by
// scripts/fetch-docs.mjs, which pulls each enabled project's persisted dist from
// its content release. Either way the folder names are the sources' `artifact`.
//
// Mounts are data-driven from sources.json (via scripts/registry.mjs) so adding a
// project is a config change, not a code change. Each project's persisted dist was
// already built to match its `base` URL. Schema-1 trees are relocated unchanged;
// schema-2 HTML is composed into the website shell while non-HTML assets keep
// their producer-generated paths.

import { cp, mkdir, access, rm, readFile, writeFile, readdir } from 'node:fs/promises'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse, serialize } from 'parse5'

import { PAGE_BUNDLE_FILENAME, pageBundleManifest } from './page-bundle-contract.mjs'

import { findNode, element, attribute, hasClass, walkNodes } from './html.mjs'
import { loadRedirects, writeRedirects } from './redirects.mjs'
import { loadRegistry, enabledSources } from './registry.mjs'
import { writeSitemaps, RXOVA_ORIGIN } from './sitemap.mjs'
import { writeLlms } from './llms.mjs'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

async function exists(p) {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

async function copyInto(src, dest, { label }) {
  if (!(await exists(src))) return false
  await mkdir(dirname(dest) === dest ? dest : dirname(dest), { recursive: true })
  await mkdir(dest, { recursive: true })
  await cp(src, dest, { recursive: true })
  console.log(`  ✓ ${label}: ${src} -> ${dest}`)
  return true
}

function mergeAttributes(target, source) {
  const byName = new Map((target.attrs ?? []).map((attr) => [attr.name, attr]))
  for (const attr of source.attrs ?? []) {
    if (attr.name === 'data-rxova-shell') continue
    if (attr.name === 'class' && byName.has('class')) {
      const values = new Set(`${byName.get('class').value} ${attr.value}`.trim().split(/\s+/))
      byName.get('class').value = [...values].join(' ')
      continue
    }
    if (byName.has(attr.name)) byName.get(attr.name).value = attr.value
    else {
      const copy = { ...attr }
      target.attrs.push(copy)
      byName.set(copy.name, copy)
    }
  }
}

function isShellOwnedHeadNode(node) {
  if (node.tagName === 'title') return false
  if (node.tagName === 'meta') {
    const name = attribute(node, 'name')?.toLowerCase()
    return attribute(node, 'charset') !== undefined || name === 'viewport'
  }
  if (node.tagName === 'link') {
    const rel = (attribute(node, 'rel') ?? '').toLowerCase().split(/\s+/)
    return rel.includes('icon') || rel.includes('apple-touch-icon')
  }
  return false
}

export function composeDocument(sourceText, shellText, label = 'page') {
  const source = parse(sourceText)
  const shell = parse(shellText)
  const sourceHtml = findNode(source, element('html'))
  const sourceHead = findNode(source, element('head'))
  const sourceBody = findNode(source, element('body'))
  const shellHtml = findNode(shell, element('html'))
  const shellHead = findNode(shell, element('head'))
  const shellBody = findNode(shell, element('body'))
  const headSlot = findNode(
    shell,
    (node) => node.tagName === 'meta' && attribute(node, 'name') === 'rxova-head-slot',
  )
  const pageSlot = findNode(shell, (node) => attribute(node, 'data-rxova-page-slot') !== undefined)

  if (
    !sourceHtml ||
    !sourceHead ||
    !sourceBody ||
    !shellHtml ||
    !shellHead ||
    !shellBody ||
    !headSlot ||
    !pageSlot
  ) {
    throw new Error(`${label}: source document or website shell is missing required structure`)
  }
  const isRedirect = Boolean(
    findNode(
      sourceHead,
      (node) =>
        node.tagName === 'meta' && attribute(node, 'http-equiv')?.toLowerCase() === 'refresh',
    ),
  )
  if (!findNode(sourceBody, element('main')) && !isRedirect) {
    throw new Error(`${label}: page-component document has no <main>`)
  }

  walkNodes(source, (node) => {
    if (
      node.tagName === 'script' &&
      (attribute(node, 'src') ?? '').includes('static.cloudflareinsights.com/beacon.min.js')
    ) {
      throw new Error(`${label}: page-component bundles must not include Cloudflare Analytics`)
    }
    if (hasClass(node, 'rx-footer') || (node.tagName === 'header' && hasClass(node, 'site'))) {
      throw new Error(`${label}: page-component bundles must not include global Rxova chrome`)
    }
  })

  mergeAttributes(shellHtml, sourceHtml)
  mergeAttributes(shellBody, sourceBody)

  const headIndex = shellHead.childNodes.indexOf(headSlot)
  const producerHead = sourceHead.childNodes.filter((node) => !isShellOwnedHeadNode(node))
  for (const node of producerHead) node.parentNode = shellHead
  shellHead.childNodes.splice(headIndex, 1, ...producerHead)

  // The shell template's placeholder title and noindex are for the private
  // template route only. Route-specific producer metadata replaces both.
  shellHead.childNodes = shellHead.childNodes.filter((node) => {
    if (node.tagName === 'title') return producerHead.includes(node)
    return !(node.tagName === 'meta' && attribute(node, 'name') === 'robots')
  })

  const slotParent = pageSlot.parentNode
  const slotIndex = slotParent.childNodes.indexOf(pageSlot)
  for (const node of sourceBody.childNodes) node.parentNode = slotParent
  slotParent.childNodes.splice(slotIndex, 1, ...sourceBody.childNodes)

  return serialize(shell)
}

async function htmlFiles(root) {
  const found = []
  async function visit(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) await visit(path)
      else if (entry.isFile() && entry.name.endsWith('.html')) found.push(path)
    }
  }
  await visit(root)
  return found
}

async function readPageBundle(src, source) {
  const path = join(src, PAGE_BUNDLE_FILENAME)
  if (!(await exists(path))) return undefined
  let raw
  try {
    raw = JSON.parse(await readFile(path, 'utf8'))
  } catch (error) {
    throw new Error(`${source.id}: invalid ${PAGE_BUNDLE_FILENAME} — ${error.message}`, {
      cause: error,
    })
  }
  const parsed = pageBundleManifest.safeParse(raw)
  if (!parsed.success) {
    throw new Error(`${source.id}: invalid ${PAGE_BUNDLE_FILENAME}`)
  }
  if (parsed.data.project !== source.id || parsed.data.base !== source.base) {
    throw new Error(
      `${source.id}: page-bundle manifest says ${parsed.data.project} at ${parsed.data.base}, expected ${source.id} at ${source.base}`,
    )
  }
  return parsed.data
}

async function composeInto(src, dest, shellPath, source) {
  await cp(src, dest, { recursive: true })
  const shell = await readFile(shellPath, 'utf8')
  for (const file of await htmlFiles(src)) {
    const rel = relative(src, file)
    const composed = composeDocument(await readFile(file, 'utf8'), shell, `${source.id}/${rel}`)
    await writeFile(join(dest, rel), composed)
  }
  await rm(join(dest, PAGE_BUNDLE_FILENAME), { force: true })
  console.log(`  ✓ ${source.id}: composed page bundle -> ${dest}`)
}

/**
 * Copy the landing and every enabled project's artifact into one tree.
 *
 * Throws rather than exiting so the CLI below owns the exit code and the tests
 * can assert on the failures — which are the point of this script: a missing
 * artifact must stop the deploy, not quietly publish a site with a hole in it.
 */
export async function assemble(config, artifactsDir, outDir) {
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

  // 2. Each enabled docs source under its mount.
  //
  // Disabled projects are simply absent from this list, so there is nothing to
  // tolerate: an enabled project whose artifact never arrived means its build
  // job failed to upload, and deploying anyway would quietly publish a site with
  // that project's docs missing and its landing link 404ing. Fail instead.
  //
  // This is stricter than it used to be, and can afford to be: gating now lives
  // in sources.json where this script can read it, rather than in repo variables
  // that only the workflow could see.
  const missing = []
  for (const s of enabledSources(config)) {
    const src = join(artifactsDir, s.artifact)
    if (!(await exists(src))) {
      missing.push(`${s.id} (expected ${src})`)
      continue
    }
    const bundle = await readPageBundle(src, s)
    if (bundle) {
      const shell = join(landingSrc, 'shell-templates', s.id, 'index.html')
      if (!(await exists(shell))) throw new Error(`website shell missing for ${s.id} at ${shell}`)
      await composeInto(src, join(outDir, s.mount), shell, s)
    } else {
      await copyInto(src, join(outDir, s.mount), { label: s.id })
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `enabled project(s) with no artifact:\n  - ${missing.join('\n  - ')}\n` +
        'Either the build job failed, or the project should be disabled in sources.json.',
    )
  }

  // Shell templates are build inputs, never public routes.
  await rm(join(outDir, 'shell-templates'), { recursive: true, force: true })

  // 3. Stand-ins for URLs that used to exist, before the sitemap is taken — a
  //    stub is a redirect, not a destination, so it must not be listed.
  await writeRedirects(outDir, config.redirects ?? {}, config.origin ?? RXOVA_ORIGIN)

  // 4. The agent-facing index. After the projects are mounted, because it probes
  //    for each one's own llms.txt and links to the docs root of any that has
  //    none — so a project can add the file on its own schedule.
  await writeLlms(outDir, enabledSources(config), config.origin ?? RXOVA_ORIGIN)

  // 5. Sitemaps last: they describe the finished tree, so everything that will
  //    ever be in it has to be there already.
  await writeSitemaps(outDir, enabledSources(config), config.origin ?? RXOVA_ORIGIN)

  console.log('Done.')
}

// Only run as a CLI; the tests import `assemble` above.
if (import.meta.filename === process.argv[1]) {
  const [, , artifactsDir = 'artifacts', outDir = '_site'] = process.argv
  const config = {
    ...loadRegistry(join(repoRoot, 'sources.json')),
    redirects: await loadRedirects(join(repoRoot, 'redirects.json')),
  }
  assemble(config, artifactsDir, outDir).catch((err) => {
    console.error(`ERROR: ${err.message}`)
    process.exit(1)
  })
}
