#!/usr/bin/env node
/** Fails a surface build whose emitted asset paths do not sit under the base it deploys to. */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/** The `_astro` asset paths an HTML document references. */
export const assetPaths = (html: string): string[] =>
  Array.from(html.matchAll(/(?:href|src)="([^"]*_astro\/[^"]*)"/g), ([, path]) => path as string)

/** Checks `<dist>/index.html` against `<base>`; returns the success line or throws the failure. */
export function checkBase([dist, base]: readonly string[]): string {
  if (!dist || !base) throw new Error('usage: check-base.ts <dist> <expected-base>')

  const index = join(dist, 'index.html')
  if (!existsSync(index)) throw new Error(`ERROR: no index.html in ${dist}`)

  const assets = assetPaths(readFileSync(index, 'utf8'))
  if (assets.length === 0) {
    throw new Error(`ERROR: ${index} references no _astro assets — nothing to check`)
  }

  const wrong = assets.filter((a) => !a.startsWith(`${base}_astro/`))
  if (wrong.length > 0) {
    throw new Error(
      'ERROR: built for the wrong base.\n' +
        `  expected every asset under ${base}_astro/\n` +
        wrong
          .slice(0, 5)
          .map((a) => `  got ${a}`)
          .join('\n') +
        "\n\nDOCS_BASE_URL was probably not passed through — see turbo.json's env for build.",
    )
  }

  return `base ok — ${assets.length} asset path(s) under ${base}_astro/`
}

/* v8 ignore start -- entry point; the publish-surface action is what runs it */
if (import.meta.main) {
  try {
    console.log(checkBase(process.argv.slice(2)))
  } catch (error) {
    console.error((error as Error).message)
    process.exitCode = 1
  }
}
/* v8 ignore stop */
