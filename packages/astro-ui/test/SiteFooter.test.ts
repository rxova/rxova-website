import { describe, expect, it } from 'vitest'

import SiteFooter from '../src/components/SiteFooter.astro'
import { render } from './render'

const hrefs = (html: string) => [...html.matchAll(/<a[^>]*href="([^"]*)"/g)].map((m) => m[1])

describe('SiteFooter', () => {
  it('links rxova.org absolutely by default, for a docs site on another origin', async () => {
    const links = hrefs(await render(SiteFooter))
    expect(links).toContain('https://rxova.org/')
    expect(links).toContain('https://rxova.org/blog/')
    expect(links).toContain('https://rxova.org/privacy/')
    expect(links).toContain('https://rxova.org/packages/journey/')
  })

  it("links root-relative when origin is '', so a preview links to itself", async () => {
    const html = await render(SiteFooter, { props: { origin: '' } })
    const own = hrefs(html).filter((h) => !/^(https?:|mailto:)/.test(h ?? ''))
    expect(own).toEqual(expect.arrayContaining(['/', '/projects/', '/blog/', '/terms/']))
    expect(html).not.toContain('https://rxova.org')
    expect(html).toContain('src="/rxova-logo-256.png"')
  })

  it('ends every rxova.org page link in a slash, which Pages serves without a redirect', async () => {
    for (const origin of ['', 'https://rxova.org']) {
      const own = hrefs(await render(SiteFooter, { props: { origin } })).filter(
        (h) => h === `${origin}/` || (h ?? '').startsWith(`${origin}/`),
      )
      for (const href of own) expect(href, href).toMatch(/\/$/)
    }
  })
})
