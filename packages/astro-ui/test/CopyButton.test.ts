import { describe, expect, it } from 'vitest'

import CopyButton from '../src/components/CopyButton.astro'
import { render } from './render.ts'

describe('CopyButton', () => {
  it('carries the text to copy, both labels and a status line for screen readers', async () => {
    const html = await render(CopyButton, { props: { text: 'npm i ts-extended-errors' } })
    expect(html).toMatch(
      /^<button class="rx-copy" type="button" data-rx-copy="npm i ts-extended-errors"/,
    )
    expect(html).toContain('<span class="rx-copy__idle">Copy</span>')
    expect(html).toContain('<span class="rx-copy__done" aria-hidden="true">Copied</span>')
    expect(html).toContain('<span class="rx-copy__status" role="status"></span>')
    expect(html).not.toContain('aria-label')
  })

  it('takes an accessible name when "Copy" alone would not say what is copied', async () => {
    const html = await render(CopyButton, {
      props: { text: 'x', label: 'Copy the install command' },
    })
    expect(html).toContain('aria-label="Copy the install command"')
  })
})
