#!/usr/bin/env node
// Fail the build when the emitted asset paths do not match the base it was built for.
//
// This is the failure the whole derivation exists to prevent, and it reached
// production anyway: the surfaces were built for `/`, deployed at `/blog/`, and every
// stylesheet 404'd. Astro reports nothing — a base of `/` is perfectly valid, just
// wrong here — so the only place it shows is in the output.
//
// Usage: node scripts/check-base.mjs <dist> <expected-base>

import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

const [dist, base] = process.argv.slice(2)
if (!dist || !base) {
  console.error('usage: check-base.mjs <dist> <expected-base>')
  process.exit(1)
}

const index = join(dist, 'index.html')
if (!existsSync(index)) {
  console.error(`ERROR: no index.html in ${dist}`)
  process.exit(1)
}

const html = readFileSync(index, 'utf8')
const assets = [...html.matchAll(/(?:href|src)="([^"]*_astro\/[^"]*)"/g)].map((m) => m[1])

if (assets.length === 0) {
  console.error(`ERROR: ${index} references no _astro assets — nothing to check`)
  process.exit(1)
}

const wrong = assets.filter((a) => !a.startsWith(`${base}_astro/`))
if (wrong.length > 0) {
  console.error(
    'ERROR: built for the wrong base.\n' +
      `  expected every asset under ${base}_astro/\n` +
      wrong
        .slice(0, 5)
        .map((a) => `  got ${a}`)
        .join('\n') +
      "\n\nDOCS_BASE_URL was probably not passed through — see turbo.json's env for build.",
  )
  process.exit(1)
}

console.log(`base ok — ${assets.length} asset path(s) under ${base}_astro/`)
