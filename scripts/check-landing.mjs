#!/usr/bin/env node
// Fail CI when the built landing is missing a project page or links a mount
// that is switched off.
//
// The build itself refuses bad input (site/src/lib/projects.ts), but nothing
// used to look at what it produced. This reads site/dist the way a visitor and a
// crawler would, and asserts the promises the overview pages make:
//
//   - every enabled package has /projects/<id>/index.html, with its own
//     canonical URL, an og:image and exactly one <h1>;
//   - the home page links every one of those pages;
//   - a disabled package has no page, and nothing links under /packages/<id>/
//     or /projects/<id>/ for it — `enabled: false` keeps a project off the site
//     entirely, and either link would be a link straight to a 404.
//
// A missing site/dist is a failure, not a skip: a check that passes because
// there was nothing to check is how this would quietly stop running.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import { parse } from 'parse5'

import { attribute, element, findNode, walkNodes } from './html.mjs'
import { loadRegistry } from './registry.mjs'

const SITE = 'https://rxova.org'
export const DIST = fileURLToPath(new URL('../site/dist/', import.meta.url))

/** Every .html file under `dir`. */
function htmlFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return htmlFiles(path)
    return name.endsWith('.html') ? [path] : []
  })
}

/** Every href in a parsed document. */
function hrefs(doc) {
  const found = []
  walkNodes(doc, (node) => {
    const href = node.tagName === 'a' || node.tagName === 'link' ? attribute(node, 'href') : null
    if (href) found.push(href)
  })
  return found
}

/** Every element with `tagName`. */
function count(doc, tagName) {
  let n = 0
  walkNodes(doc, (node) => {
    if (node.tagName === tagName) n++
  })
  return n
}

const meta = (doc, property) =>
  findNode(doc, (n) => n.tagName === 'meta' && attribute(n, 'property') === property)

/**
 * Problems with the built landing at `dist`, given the registry's packages;
 * empty when there are none.
 */
export function checkLanding(dist, sources) {
  if (!existsSync(join(dist, 'index.html'))) {
    return [`${dist} has no index.html — run \`pnpm build\` first`]
  }

  const problems = []
  const packages = sources.filter((s) => s.kind === 'package' && s.enabled)
  const disabled = sources.filter((s) => s.kind === 'package' && !s.enabled)
  const read = (path) => parse(readFileSync(path, 'utf8'))

  for (const { id } of packages) {
    const file = join(dist, 'projects', id, 'index.html')
    if (!existsSync(file)) {
      problems.push(`/projects/${id}/ was not built`)
      continue
    }
    const doc = read(file)

    const canonical = findNode(
      doc,
      (n) => element('link')(n) && attribute(n, 'rel') === 'canonical',
    )
    const expected = `${SITE}/projects/${id}/`
    if (attribute(canonical ?? {}, 'href') !== expected) {
      problems.push(
        `/projects/${id}/ has canonical ${attribute(canonical ?? {}, 'href')}, not ${expected}`,
      )
    }
    if (!attribute(meta(doc, 'og:image') ?? {}, 'content')) {
      problems.push(`/projects/${id}/ has no og:image`)
    }
    const h1s = count(doc, 'h1')
    if (h1s !== 1) problems.push(`/projects/${id}/ has ${h1s} <h1> elements, not 1`)
  }

  const home = hrefs(read(join(dist, 'index.html')))
  for (const { id } of packages) {
    if (!home.includes(`/projects/${id}/`))
      problems.push(`the home page does not link /projects/${id}/`)
  }

  for (const { id } of disabled) {
    if (existsSync(join(dist, 'projects', id)))
      problems.push(`/projects/${id}/ was built, but ${id} is disabled`)
  }

  const forbidden = disabled.flatMap((s) => [s.base, `/projects/${s.id}/`])
  for (const file of htmlFiles(dist)) {
    // Shell templates are build inputs composed into docs pages, not pages.
    const path = relative(dist, file)
    if (path.startsWith('shell-templates')) continue
    for (const href of hrefs(read(file))) {
      const target = href.replace(SITE, '')
      const base = forbidden.find((b) => target.startsWith(b))
      if (base) problems.push(`${path} links ${href}, but that project is disabled`)
    }
  }

  return problems
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const { sources } = loadRegistry()
    const problems = checkLanding(DIST, sources)
    if (problems.length) {
      for (const p of problems) console.error(`ERROR: ${p}`)
      process.exit(1)
    }
    const n = sources.filter((s) => s.kind === 'package' && s.enabled).length
    console.log(`site/dist OK — ${n} project page(s), nothing built or linked for disabled ones`)
  } catch (err) {
    console.error(`ERROR: ${err.message}`)
    process.exit(1)
  }
}
