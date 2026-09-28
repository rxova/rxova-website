import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { listFiles, snapshot, stylesheetPath } from './snapshot.ts'

async function site(files: Record<string, string | Buffer>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'lock-site-'))
  for (const [path, content] of Object.entries(files)) {
    await mkdir(dirname(join(dir, path)), { recursive: true })
    await writeFile(join(dir, path), content)
  }
  return dir
}

describe('stylesheetPath', () => {
  it('resolves root-relative and page-relative hrefs, dropping queries', () => {
    expect(stylesheetPath('/s', 'blog/index.html', '/_astro/a.css?v=1')).toBe('/s/_astro/a.css')
    expect(stylesheetPath('/s', 'blog/index.html', '../b.css#x')).toBe('/s/b.css')
  })

  it('does not resolve other origins', () => {
    expect(stylesheetPath('/s', 'index.html', 'https://fonts.example/a.css')).toBeUndefined()
    expect(stylesheetPath('/s', 'index.html', '//cdn.example/a.css')).toBeUndefined()
  })
})

describe('snapshot', () => {
  it('writes each page as markup plus its CSS, other text as text, and lists the rest', async () => {
    const dir = await site({
      'index.html':
        '<html><head><link rel="stylesheet" href="/_astro/a.Abc12345.css"></head><body><p>hi</p></body></html>',
      '_astro/a.Abc12345.css': 'p{color:red}',
      '_astro/s.Xyz98765.js': 'console.log(1)',
      'sitemap.xml': '<urlset/>',
      'logo.png': Buffer.from([1, 2, 3]),
    })
    const out = await mkdtemp(join(tmpdir(), 'lock-out-'))
    await snapshot([{ name: 'site', dir }], out)

    expect(await listFiles(join(out, 'site'))).toEqual([
      '_assets.txt',
      'index.html',
      'index.html.css',
      'sitemap.xml',
    ])
    expect(await readFile(join(out, 'site/index.html.css'), 'utf8')).toBe('p {\n  color: red;\n}\n')
    expect(await readFile(join(out, 'site/index.html'), 'utf8')).toContain('<p>hi</p>')
    expect(await readFile(join(out, 'site/_assets.txt'), 'utf8')).toBe(
      '_astro/a.[hash].css\n_astro/s.[hash].js\n' +
        'logo.png  039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81\n',
    )
  })

  it('marks a page whose stylesheet is on another origin', async () => {
    const dir = await site({
      'index.html': '<link rel="stylesheet" href="https://x.example/a.css"><p>x</p>',
    })
    const out = await mkdtemp(join(tmpdir(), 'lock-out-'))
    await snapshot([{ name: 'site', dir }], out)
    expect(await readFile(join(out, 'site/index.html.css'), 'utf8')).toContain(
      '@unresolved-stylesheet "https://x.example/a.css";',
    )
  })
})
