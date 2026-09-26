import { describe, expect, it } from 'vitest'

import Shots from './fixtures/Shots.astro'
import { render } from './render.ts'

describe('ScreenshotGrid', () => {
  it('renders each shot with a numbered caption, and the link with a marker when external', async () => {
    const html = await render(Shots)
    expect(html.match(/<li class="rx-shots__item">/g)).toHaveLength(2)
    expect(html).toContain('<span class="rx-shots__index" aria-hidden="true">01</span>')
    expect(html).toContain('<span class="rx-shots__title">Timeline</span>')
    expect(html).toContain('<span class="rx-shots__body">The realized path.</span>')
    expect(html).toMatch(/<img[^>]+alt="The card"/)
    expect(html).toMatch(
      /<a class="rx-shots__link" href="https:\/\/example.com\/" rel="noopener">Get it<svg/,
    )
    expect(html).toContain('M5 3h8v8M13 3 3 13')
  })
})
