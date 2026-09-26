#!/usr/bin/env node

import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { PAGE_BUNDLE_FILENAME, createPageBundleManifest } from '@rxova/website-schemas'

/** Writes the page-bundle manifest into `<dist>`, from the CLI arguments `<dist> <project> <base>`. */
export async function writePageBundle(
  [dist, project, base]: readonly string[],
  log: (message: string) => void = console.log,
): Promise<void> {
  if (!dist || !project || !base) {
    throw new Error('usage: write-page-bundle.ts <dist> <project> <base>')
  }

  const manifest = createPageBundleManifest(project, base)
  await writeFile(join(dist, PAGE_BUNDLE_FILENAME), `${JSON.stringify(manifest, null, 2)}\n`)
  log(`Wrote ${join(dist, PAGE_BUNDLE_FILENAME)}`)
}

/* v8 ignore start -- entry point; the publish-surface action is what runs it */
if (import.meta.main) await writePageBundle(process.argv.slice(2))
/* v8 ignore stop */
