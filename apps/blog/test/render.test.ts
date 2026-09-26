/**
 * What a real build of this package emits for posts with images, built against
 * `test/fixtures` (via `BLOG_POSTS_DIR`) because `posts/` is published.
 */

import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, existsSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { beforeAll, afterAll, describe, expect, it } from 'vitest'

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

/** The mount the aggregator serves this at. Asset URLs are wrong without it. */
const BASE = '/blog/'

let out: string

/**
 * One build for the whole file; nothing here mutates the output.
 * `stdio: 'pipe'` keeps a passing run quiet and puts the full log in a failure's message.
 */
beforeAll(() => {
  out = mkdtempSync(join(tmpdir(), 'rxova-blog-render-'))

  // A warm image cache can satisfy a build with no image service at all, hiding a
  // missing `sharp` locally; clear it so the build is always cold.
  rmSync(join(packageRoot, 'node_modules/.astro/assets'), { recursive: true, force: true })

  try {
    execFileSync(join(packageRoot, 'node_modules/.bin/astro'), ['build', '--outDir', out], {
      cwd: packageRoot,
      env: { ...process.env, DOCS_BASE_URL: BASE, BLOG_POSTS_DIR: './test/fixtures/posts' },
      stdio: 'pipe',
    })
  } catch (err) {
    const e = err as { stdout?: Buffer; stderr?: Buffer }
    throw new Error(
      `astro build failed\n\n${e.stdout?.toString() ?? ''}\n${e.stderr?.toString() ?? ''}`,
      { cause: err },
    )
  }
}, 180_000)

afterAll(() => {
  if (out) rmSync(out, { recursive: true, force: true })
})

const page = (slug: string): string => readFileSync(join(out, slug, 'index.html'), 'utf8')

interface Img {
  readonly src: string
  readonly alt: string
  /** Whether the attribute is there at all — `alt=""` and no alt are not the same. */
  readonly hasAlt: boolean
  readonly srcset: readonly { url: string; width: number }[]
  readonly sizes: string
  readonly className: string
}

/** The `<img>` elements a page renders, minus the chrome's logo. */
function images(html: string): Img[] {
  return [...html.matchAll(/<img\s[^>]*>/g)]
    .map((m) => m[0])
    .filter((tag) => !tag.includes('rxova-logo'))
    .map((tag) => {
      // A bare `alt` is how an empty alt serialises, so match it as well as `alt="…"`.
      const attr = (name: string): string => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1] ?? ''
      const has = (name: string): boolean =>
        new RegExp(`\\s${name}(="[^"]*")?(?=[\\s>/])`).test(tag)

      return {
        src: attr('src'),
        alt: attr('alt'),
        hasAlt: has('alt'),
        sizes: attr('sizes'),
        className: attr('class'),
        srcset: attr('srcset')
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean)
          .map((c) => {
            const [url, w] = c.split(/\s+/)
            return { url: url!, width: Number.parseInt(w ?? '0', 10) }
          }),
      }
    })
}

const cover = (slug: string): Img => {
  const found = images(page(slug)).find((i) => i.className.includes('cover'))
  if (!found) throw new Error(`no cover rendered on /${slug}`)
  return found
}

const bodyImages = (slug: string): Img[] =>
  images(page(slug)).filter((i) => !i.className.includes('cover'))

// A cover in the frontmatter needs `sharp` to render; assert the output is a real
// raster the pipeline produced.
describe('the asset pipeline', () => {
  it('emits WebP, which means sharp ran', () => {
    const { url } = cover('cover-described').srcset[0]!
    const bytes = readFileSync(join(out, url.replace(BASE, '')))
    expect(bytes.subarray(0, 4).toString('ascii')).toBe('RIFF')
    expect(bytes.subarray(8, 12).toString('ascii')).toBe('WEBP')
  })

  it('actually resizes, rather than aliasing one file at several widths', () => {
    const { srcset } = cover('cover-described')
    const sizes = srcset.map(({ url }) => statSync(join(out, url.replace(BASE, ''))).size)
    expect(new Set(srcset.map((c) => c.url)).size).toBe(srcset.length)
    // Ascending width must mean ascending bytes for the same source image.
    expect([...sizes].sort((a, b) => a - b)).toEqual(sizes)
  })

  // Scoped to the post's own images on purpose: the chrome links a PNG favicon and
  // a PNG social card, neither of which goes through this pipeline.
  it('converts every local source, shipping no original PNG', () => {
    for (const slug of ['cover-described', 'cover-decorative']) {
      for (const img of images(page(slug))) {
        if (img.src.startsWith('http')) continue
        for (const url of [img.src, ...img.srcset.map((c) => c.url)]) {
          expect(url, `${url} on /${slug} was not converted`).toMatch(/\.webp$/)
        }
      }
    }
  })

  // The whole surface is mounted at a subpath, and Astro is the only thing that
  // rewrites these. A bare `/_astro/…` would 404 in production and nowhere else.
  it('prefixes every generated asset with the mount', () => {
    for (const slug of ['cover-described', 'cover-decorative']) {
      for (const img of images(page(slug))) {
        const urls = [img.src, ...img.srcset.map((c) => c.url)]
        for (const url of urls) {
          if (url.startsWith('http')) continue
          expect(url.startsWith(BASE), `${url} on /${slug} is not under ${BASE}`).toBe(true)
        }
      }
    }
  })

  it('writes every file it references', () => {
    for (const slug of ['cover-described', 'cover-decorative']) {
      for (const img of images(page(slug))) {
        for (const url of [img.src, ...img.srcset.map((c) => c.url)]) {
          if (url.startsWith('http')) continue
          expect(existsSync(join(out, url.replace(BASE, ''))), `${url} was not written`).toBe(true)
        }
      }
    }
  })
})

describe('the cover', () => {
  it('carries coverAlt when the post describes it', () => {
    expect(cover('cover-described').alt).toBe(
      'A gradient running blue to magenta, described because it is not decorative.',
    )
  })

  // A decorative cover wants an empty alt: not the title, and not a missing
  // attribute, which leaves a screen reader announcing the URL.
  it('renders an empty alt when the post does not describe it', () => {
    const img = cover('cover-decorative')
    expect(img.alt).toBe('')
    expect(img.hasAlt, 'the alt attribute must be present, just empty').toBe(true)
  })

  it('offers the widths the page asks for', () => {
    expect(cover('cover-described').srcset.map((c) => c.width)).toEqual([640, 960, 1280])
  })

  // Derived `sizes` would claim the image's own width — 1600px against a 44rem
  // column — and pull a candidate larger than the column can ever show.
  it('declares sizes against the real column, not the image width', () => {
    expect(cover('cover-described').sizes).toBe('(min-width: 44rem) 44rem, 100vw')
  })

  it('loads eagerly, being above the fold', () => {
    expect(page('cover-described')).toContain('loading="eager"')
  })
})

describe('an embedded body image', () => {
  it('is optimised and responsive, which a markdown embed is not by default', () => {
    const [first] = bodyImages('cover-described')
    expect(first!.srcset.length).toBeGreaterThan(1)
    expect(first!.src).toContain('.webp')
  })

  it('keeps its markdown alt text', () => {
    expect(bodyImages('cover-described')[0]!.alt).toBe('A square diagram, teal shading to blue')
  })

  it('renders an empty alt for the decorative form', () => {
    expect(bodyImages('cover-described')[1]!.alt).toBe('')
  })

  it('loads lazily, being below the fold', () => {
    expect(bodyImages('cover-described')[0]!.src).toBeTruthy()
    expect(page('cover-described')).toContain('loading="lazy"')
  })

  it('leaves a remote image alone, having no local file to optimise', () => {
    const remote = bodyImages('cover-described').find((i) => i.src.startsWith('http'))
    expect(remote?.src).toBe('https://example.com/not-fetched.png')
    expect(remote?.alt).toBe('Remote')
  })

  /**
   * The fixture puts a missing path in a fence and in inline code: both must render
   * as text, not as images. Three embeds: described, decorative, remote.
   */
  it('is not conjured out of a fenced or inline code sample', () => {
    const html = page('cover-described')
    expect(html).toContain('../images/nowhere/missing.png')
    expect(html).toContain('<pre')

    const rendered = images(html).flatMap((i) => [i.src, ...i.srcset.map((c) => c.url)])
    expect(rendered.some((url) => url.includes('nowhere'))).toBe(false)
    expect(bodyImages('cover-described')).toHaveLength(3)
  })
})

describe('a post with no images in its body', () => {
  it('still builds, and renders only its cover', () => {
    expect(bodyImages('cover-decorative')).toEqual([])
    expect(cover('cover-decorative').src).toContain('.webp')
  })
})

/**
 * The index batches posts with JS, so the HTML must still carry every post and ship
 * the control `hidden`; otherwise no-JS readers see a truncated index and a dead button.
 */
describe('the batched index', () => {
  const index = (): string => readFileSync(join(out, 'index.html'), 'utf8')

  it('ships every post, batching or not', () => {
    const html = index()
    expect(html).toContain('data-reveal-list')
    // Base-agnostic on purpose: the claim is that the post is *on the page*, and
    // whether the mount prefix is applied is already pinned by the asset tests.
    for (const slug of ['cover-described', 'cover-decorative']) {
      expect(html).toMatch(new RegExp(`class="title" href="[^"]*/${slug}"`))
    }
  })

  it('ships the control hidden, so no-JS gets no dead button', () => {
    const controls = /<div[^>]*data-reveal-controls[^>]*>/.exec(index())?.[0]
    expect(controls).toBeDefined()
    expect(controls).toMatch(/\shidden(="[^"]*")?(?=[\s>/])/)
  })

  it('declares the batch size the page component chose', () => {
    expect(index()).toMatch(/data-reveal-step="10"/)
  })
})
