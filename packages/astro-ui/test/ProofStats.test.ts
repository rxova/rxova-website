import { describe, expect, it } from 'vitest'

import ProofStats from '../src/components/ProofStats.astro'
import { render } from './render.ts'

describe('ProofStats', () => {
  it('renders every stat at its final value, so the panel reads without JS', async () => {
    const html = await render(ProofStats, {
      props: {
        stats: [
          { value: '7.58 kB', label: 'Core', note: 'brotli' },
          { value: 'MIT', label: 'Licence', note: 'every package' },
        ],
      },
    })
    expect(html).toContain('<p class="rx-stats__value">7.58 kB</p>')
    expect(html).toContain('<p class="rx-stats__label">Core</p>')
    expect(html).toContain('<p class="rx-stats__note">brotli</p>')
    expect(html).toContain('<p class="rx-stats__value">MIT</p>')
    expect(html.match(/<li class="rx-stats__item">/g)).toHaveLength(2)
  })
})
