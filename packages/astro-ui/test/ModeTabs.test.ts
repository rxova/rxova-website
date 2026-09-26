import { describe, expect, it } from 'vitest'

import Modes from './fixtures/Modes.astro'
import { render } from './render.ts'

describe('ModeTabs', () => {
  it('numbers the modes and places each named slot in its pane, empty when missing', async () => {
    const html = await render(Modes)
    expect(html).toContain('<span class="rx-modes__step" aria-hidden="true">1</span>')
    expect(html).toContain('<h3 class="rx-modes__name">Linear</h3>')
    expect(html).toContain('<p class="rx-modes__summary">A fixed sequence.</p>')
    expect(html).toContain('<div class="rx-modes__code"><pre>steps: []</pre></div>')
    expect(html).toContain('<div class="rx-modes__code"><pre>steps: graph</pre></div>')
    expect(html).toContain('<h3 class="rx-modes__name">Missing</h3>')
    expect(html).toContain('<div class="rx-modes__code"></div>')
  })
})
