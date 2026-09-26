// Checks that each landing `demo` URL and `snippet` import in sources.json resolves.
// npm is queried via the registry, since www.npmjs.com answers 403 to non-browsers.

import { describe, it } from 'vitest'
import assert from 'node:assert/strict'

import { readFileSync } from 'node:fs'

import { SOURCES_FILE } from '../lib/registry.ts'

const TIMEOUT = 45_000

/** Retries what is transient (rate limits, 5xx, network), never a 404. */
async function status(url: string, method: string): Promise<number> {
  let last = 0
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        method,
        redirect: 'follow',
        signal: AbortSignal.timeout(10_000),
      })
      last = res.status
      if (res.status !== 429 && res.status < 500) return res.status
    } catch {
      last = 0
    }
    await new Promise((r) => setTimeout(r, 1_000 * (attempt + 1)))
  }
  return last
}

/** `@scope/name/sub` -> `@scope/name`; `name/sub` -> `name`. */
function packageName(specifier: string): string {
  const parts = specifier.split('/')
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : (parts[0] ?? specifier)
}

/** Bare package specifiers a snippet imports from, skipping relative paths and node builtins. */
function snippetImports(snippet: string): string[] {
  const specifiers = [...snippet.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)].map((m) => m[1] ?? '')
  return [
    ...new Set(
      specifiers.filter((s) => !s.startsWith('.') && !s.startsWith('node:')).map(packageName),
    ),
  ]
}

// Raw, not through loadRegistry: its schema keeps only what the deploy needs and
// drops `demo` and `snippet`, which the landing reads straight from the file.
/** Off by default, so a flaky registry cannot fail a pull request; the weekly `links` workflow sets it. */
const network = process.env.RX_NETWORK_TESTS === '1'

interface LandingEntry {
  id: string
  landing?: { demo?: string; snippet?: string }
}

const withLanding = (
  JSON.parse(readFileSync(SOURCES_FILE, 'utf8')) as { sources: LandingEntry[] }
).sources.filter(
  // Only entries with something to check: an empty describe fails the run.
  (s) => s.landing?.demo || s.landing?.snippet,
)

describe('snippetImports', () => {
  it('reduces deep and scoped imports to their package and drops local ones', () => {
    const snippet = [
      "import { a } from '@rxova/journey-core/sub'",
      "import b from 'use-everywhere'",
      "import c from './local'",
      "import d from 'node:fs'",
      "import e from 'use-everywhere/react'",
    ].join('\n')
    assert.deepEqual(snippetImports(snippet), ['@rxova/journey-core', 'use-everywhere'])
  })
})

describe.each(withLanding.map((s): [string, LandingEntry] => [s.id, s]))(
  '%s landing links',
  (_, source) => {
    const { demo, snippet } = source.landing ?? {}

    if (demo) {
      it.runIf(network)(
        `serves its demo at ${demo}`,
        async () => {
          assert.equal(await status(demo, 'GET'), 200)
        },
        TIMEOUT,
      )
    }

    for (const pkg of snippet ? snippetImports(snippet) : []) {
      it.runIf(network)(
        `imports ${pkg}, which is published on npm`,
        async () => {
          const url = `https://registry.npmjs.org/${encodeURIComponent(pkg)}`
          assert.equal(await status(url, 'GET'), 200)
        },
        TIMEOUT,
      )
    }
  },
)
