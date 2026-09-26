import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { beforeAll, describe, expect, it } from 'vitest'

import BackLink from '../src/components/BackLink.astro'
import PageHeader from '../src/components/PageHeader.astro'
import ShowMore from '../src/components/ShowMore.astro'
import VisuallyHidden from '../src/components/VisuallyHidden.astro'
import SpacedBack from './fixtures/SpacedBack.astro'

let container: AstroContainer

beforeAll(async () => {
  container = await AstroContainer.create()
})

/** Rendered HTML without Astro's scope attributes, which change with the file's path. */
const render = async (
  component: Parameters<AstroContainer['renderToString']>[0],
  options: Parameters<AstroContainer['renderToString']>[1] = {},
) =>
  (await container.renderToString(component, options)).replace(
    / data-astro-cid-[a-z0-9]+(="true")?/g,
    '',
  )

describe('VisuallyHidden', () => {
  it('wraps its slot, keeping the leading space', async () => {
    expect(await render(VisuallyHidden, { slots: { default: ' posts' } })).toBe(
      '<span class="visually-hidden"> posts</span>',
    )
  })
})

describe('VisuallyHidden attributes', () => {
  it('passes attributes through, so a script can find it', async () => {
    const html = await render(VisuallyHidden, {
      props: { 'data-play-label': '' },
      slots: { default: 'Play' },
    })
    expect(html).toBe('<span class="visually-hidden" data-play-label>Play</span>')
  })
})

describe('BackLink', () => {
  it('prefixes the label with a left arrow', async () => {
    expect(await render(BackLink, { props: { href: '/blog/' }, slots: { default: 'Blog' } })).toBe(
      '<a class="back-link" href="/blog/">← Blog</a>',
    )
  })

  it("takes the caller's class and scope, so the caller can space it", async () => {
    const html = await container.renderToString(SpacedBack)
    expect(html).toMatch(/<a class="back-link gap" href="\/" data-astro-cid-[a-z0-9]+="true"/)
    expect(html).toContain('Read more<span class="visually-hidden"')
  })
})

describe('PageHeader', () => {
  it('renders an index title with a wide lede by default', async () => {
    const html = await render(PageHeader, {
      props: { title: 'Updates' },
      slots: { default: 'What moves.' },
    })
    expect(html).toBe(
      '<header class="head index"><h1>Updates</h1><p class="lede wide">What moves.</p></header>',
    )
  })

  it('renders a back link, the detail title and a narrow lede', async () => {
    const html = await render(PageHeader, {
      props: {
        title: 'journey',
        back: { href: '/updates/', label: 'All repos' },
        variant: 'detail',
        measure: 'narrow',
      },
    })
    expect(html).toContain(
      '<header class="head detail"><a class="back-link back" href="/updates/">← All repos</a>',
    )
    expect(html).toContain('<p class="lede narrow">')
  })
})

describe('ShowMore', () => {
  it('ships hidden, with the hooks the scripts drive', async () => {
    const html = await render(ShowMore, { props: { noun: 'posts' } })
    expect(html).toMatch(/^<div class="more" data-reveal-controls hidden>/)
    for (const hook of ['data-reveal-more', 'data-reveal-all', 'data-reveal-progress']) {
      expect(html).toContain(hook)
    }
  })

  it('names the button after what the list holds', async () => {
    const html = await render(ShowMore, { props: { noun: 'updates' } })
    expect(html).toMatch(/Show more<span class="visually-hidden"> updates<\/span>/)
  })
})
