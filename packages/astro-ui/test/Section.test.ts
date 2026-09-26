import { describe, expect, it } from 'vitest'

import Section from '../src/components/Section.astro'
import { render } from './render.ts'

describe('Section', () => {
  it('renders the heading, opts out of prose styling and takes an id', async () => {
    const html = await render(Section, {
      props: { id: 'proof', eyebrow: 'Proof', title: 'Numbers', lede: 'Read from CI.' },
      slots: { default: '<p>body</p>' },
    })
    expect(html).toBe(
      '<section class="rx-sec not-content" id="proof"><header class="rx-sec__head">' +
        '<p class="rx-sec__eyebrow">Proof</p><h2 class="rx-sec__title">Numbers</h2>' +
        '<p class="rx-sec__lede">Read from CI.</p></header><p>body</p></section>',
    )
  })

  it('adds the accent class and leaves out what it was not given', async () => {
    const html = await render(Section, { props: { title: 'Plain', accent: true } })
    expect(html).toMatch(/^<section class="rx-sec not-content rx-sec--accent">/)
    expect(html).not.toContain('rx-sec__eyebrow')
    expect(html).not.toContain('rx-sec__lede')
  })
})
