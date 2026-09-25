#!/usr/bin/env node

import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import {
  PAGE_BUNDLE_FILENAME,
  createPageBundleManifest,
} from '../packages/website-schemas/dist/index.js'

const [, , dist, project, base] = process.argv
if (!dist || !project || !base) {
  throw new Error('usage: write-page-bundle.mjs <dist> <project> <base>')
}

const manifest = createPageBundleManifest(project, base)
await writeFile(join(dist, PAGE_BUNDLE_FILENAME), `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`Wrote ${join(dist, PAGE_BUNDLE_FILENAME)}`)
