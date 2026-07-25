/**
 * Copies the generated social cards out of @rxova/brand into the landing's
 * public/ directory.
 *
 * All four cards are served from the apex — the docs sites at /packages/* point
 * their og:image at `https://rxova.org/og/<project>.png` rather than shipping
 * their own copy, so a card lives in exactly one place and a rebrand is one
 * package bump instead of four.
 *
 * Copied at build time rather than committed so they cannot drift from the
 * installed version of the package. public/og/ is gitignored.
 */

import { cpSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

// Resolve from site/, which is where @rxova/brand is a dependency — this script
// lives at the repo root, where it is not installed. Going through the package's
// own exports rather than guessing at a node_modules path also keeps this
// working under pnpm's non-flat layout.
const require = createRequire(join(repoRoot, 'site', 'package.json'))
const source = dirname(require.resolve('@rxova/brand/assets/og/rxova.png'))
const target = join(repoRoot, 'site/public/og')

mkdirSync(target, { recursive: true })
cpSync(source, target, { recursive: true })

console.log(`✓ synced social cards from @rxova/brand into site/public/og`)
