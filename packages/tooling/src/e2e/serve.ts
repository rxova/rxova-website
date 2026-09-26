/** Builds and assembles the site like the deploy does, then serves `_site` for the e2e specs. */
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { extname, join, normalize, resolve } from 'node:path'

import { buildCheckout } from '../lock/build.ts'

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
}

/** Maps a URL path to a file under `root` the way GitHub Pages does: directories serve their index. */
export async function resolveFile(root: string, urlPath: string): Promise<string | undefined> {
  const path = normalize(join(root, decodeURIComponent(urlPath.split('?')[0] ?? '/')))
  if (!path.startsWith(root)) return undefined
  for (const candidate of [path, join(path, 'index.html')]) {
    const info = await stat(candidate).catch(() => undefined)
    if (info?.isFile()) return candidate
  }
  return undefined
}

async function main(): Promise<void> {
  const repoRoot = resolve(import.meta.dirname, '../../../..')
  const work = join(tmpdir(), 'rxova-e2e')
  const { roots } = await buildCheckout(repoRoot, work)
  const site = roots.find((r) => r.name === 'site')?.dir ?? join(work, '_site')
  const port = Number(process.env.PORT ?? 4480)

  createServer((request, response) => {
    void resolveFile(site, request.url ?? '/').then(async (file) => {
      const target = file ?? (await resolveFile(site, '/404.html'))
      response.writeHead(file ? 200 : 404, {
        'content-type': TYPES[extname(target ?? '')] ?? 'application/octet-stream',
      })
      if (target) createReadStream(target).pipe(response)
      else response.end('Not found')
    })
  }).listen(port, () => console.log(`e2e: serving ${site} on http://localhost:${port}`))
}

if (import.meta.main) await main()
