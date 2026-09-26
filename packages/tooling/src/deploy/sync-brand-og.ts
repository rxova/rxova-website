/**
 * Copies @rxova/brand's social cards into the landing's public/og (gitignored) at build time;
 * every site's og:image points at `https://rxova.org/og/<project>.png`.
 */

import { cpSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../..')

/** Copies the cards into `<root>/apps/landing/public/og`, resolving @rxova/brand from there. */
export function syncBrandOg(root = repoRoot, log: (message: string) => void = console.log): void {
  // Resolve via the package's exports from apps/landing/, where @rxova/brand is installed
  // (it is not at the repo root, and pnpm's layout is non-flat).
  const require = createRequire(join(root, 'apps', 'landing', 'package.json'))
  const source = dirname(require.resolve('@rxova/brand/assets/og/rxova.png'))
  const target = join(root, 'apps/landing/public/og')

  mkdirSync(target, { recursive: true })
  cpSync(source, target, { recursive: true })

  log(`✓ synced social cards from @rxova/brand into apps/landing/public/og`)
}

/* v8 ignore start -- entry point; `pnpm sync:og` is what runs it */
if (import.meta.main) syncBrandOg()
/* v8 ignore stop */
