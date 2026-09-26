/** Builds the preview, then screenshots every gallery page in both colour schemes. Usage: `pnpm screenshots`. */
import { spawn, spawnSync } from 'node:child_process'
import { mkdirSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

import { chromium } from '@playwright/test'

const app = resolve(import.meta.dirname, '..')
const out = resolve(app, '../../packages/astro-ui/screenshots')
const port = Number(process.env.PORT ?? 4329)
const origin = `http://localhost:${port}`

/** The gallery's component pages: every entry but the index. */
export const gallerySlugs = (dir = resolve(app, 'src/content/docs/gallery')): string[] =>
  readdirSync(dir)
    .filter((file) => file.endsWith('.mdx') && file !== 'index.mdx')
    .map((file) => file.replace(/\.mdx$/, ''))
    .sort()

const waitFor = async (url: string): Promise<void> => {
  for (let attempt = 0; attempt < 100; attempt++) {
    const ok = await fetch(url)
      .then((r) => r.ok)
      .catch(() => false)
    if (ok) return
    await new Promise((r) => setTimeout(r, 200))
  }
  throw new Error(`${url} did not come up`)
}

async function main(): Promise<void> {
  const build = spawnSync('pnpm', ['exec', 'astro', 'build'], { cwd: app, stdio: 'inherit' })
  if (build.status !== 0) process.exit(build.status ?? 1)

  const server = spawn('pnpm', ['exec', 'astro', 'preview', '--port', String(port)], {
    cwd: app,
    stdio: 'ignore',
  })
  try {
    await waitFor(`${origin}/gallery/`)
    mkdirSync(out, { recursive: true })
    const browser = await chromium.launch()
    for (const scheme of ['light', 'dark'] as const) {
      const context = await browser.newContext({
        colorScheme: scheme,
        reducedMotion: 'reduce',
        viewport: { width: 1280, height: 900 },
        deviceScaleFactor: 2,
      })
      const page = await context.newPage()
      for (const slug of gallerySlugs()) {
        await page.goto(`${origin}/gallery/${slug}/`)
        await page.evaluate(() => document.fonts.ready)
        const content = page.locator('.sl-markdown-content')
        const file = resolve(out, `${slug}${scheme === 'dark' ? '-dark' : ''}.png`)
        await content.screenshot({ path: file, animations: 'disabled' })
        console.log(`✓ ${file}`)
      }
      await context.close()
    }
    await browser.close()
  } finally {
    server.kill()
  }
}

if (import.meta.main) await main()
