/** Writes the comparable form of a built site: every page's markup and CSS, and every other output. */
import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, extname, join, posix, relative, sep } from 'node:path'

import {
  maskAssetHashes,
  normaliseCss,
  normaliseHtml,
  normaliseText,
  splitPageStyles,
} from './normalise.ts'

export interface SnapshotRoot {
  /** Folder name for this root inside the snapshot. */
  name: string
  /** A built site, served from its root. */
  dir: string
}

const TEXT_EXTENSIONS = new Set(['.xml', '.txt', '.json', '.webmanifest'])
/** Covered elsewhere: stylesheets per page, scripts by the e2e specs. Listed by name only. */
const NAME_ONLY_EXTENSIONS = new Set(['.css', '.js', '.mjs'])

export async function listFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true })
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => relative(dir, join(entry.parentPath, entry.name)).split(sep).join('/'))
    .sort()
}

async function readIfExists(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, 'utf8')
  } catch {
    return undefined
  }
}

/** Resolves a stylesheet href the way the browser would for a site served from `dir`. */
export function stylesheetPath(dir: string, pagePath: string, href: string): string | undefined {
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//')) return undefined
  const path = href.replace(/[?#].*$/, '')
  const resolved = path.startsWith('/') ? path : posix.join(posix.dirname(`/${pagePath}`), path)
  return join(dir, ...posix.normalize(resolved).split('/'))
}

async function write(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, content)
}

export async function snapshotRoot(root: SnapshotRoot, outDir: string): Promise<void> {
  const assets: string[] = []
  for (const file of await listFiles(root.dir)) {
    const extension = extname(file)
    const out = join(outDir, root.name, maskAssetHashes(file))
    const content = await readFile(join(root.dir, file))

    if (extension === '.html') {
      const { html, css } = await splitPageStyles(content.toString('utf8'), async (href) => {
        const path = stylesheetPath(root.dir, file, href)
        return path ? readIfExists(path) : undefined
      })
      await write(out, await normaliseHtml(html))
      await write(`${out}.css`, await normaliseCss(css))
    } else if (TEXT_EXTENSIONS.has(extension)) {
      await write(out, await normaliseText(content.toString('utf8'), extension))
    } else if (NAME_ONLY_EXTENSIONS.has(extension)) {
      assets.push(maskAssetHashes(file))
    } else {
      assets.push(`${maskAssetHashes(file)}  ${createHash('sha256').update(content).digest('hex')}`)
    }
  }
  await write(join(outDir, root.name, '_assets.txt'), `${assets.sort().join('\n')}\n`)
}

export async function snapshot(roots: readonly SnapshotRoot[], outDir: string): Promise<void> {
  for (const root of roots) await snapshotRoot(root, outDir)
}
