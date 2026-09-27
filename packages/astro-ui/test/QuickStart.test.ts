import { describe, expect, it } from 'vitest'

import QuickStart from '../src/components/QuickStart.astro'
import { render } from './render.ts'

describe('QuickStart', () => {
  it('shows the command in a labelled region with a copy button', async () => {
    const html = await render(QuickStart, { props: { command: 'npm i @rxova/journey-core' } })
    expect(html).toContain('role="region" aria-label="Install command"')
    expect(html).toContain(
      '<span class="rx-qs__prompt" aria-hidden="true">$</span>npm i @rxova/journey-core',
    )
    expect(html).toContain('data-rx-copy="npm i @rxova/journey-core"')
    expect(html).toContain('aria-label="Copy the install command"')
  })

  it('frames whatever the page slots in as the snippet', async () => {
    const html = await render(QuickStart, {
      props: { command: 'npm i x' },
      slots: { default: '<pre>code</pre>' },
    })
    expect(html).toContain('<div class="rx-qs__code"><pre>code</pre></div>')
  })
})
