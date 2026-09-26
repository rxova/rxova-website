import { describe, expect, it } from 'vitest'

import SizeTable from '../src/components/SizeTable.astro'
import { render } from './render.ts'

describe('SizeTable', () => {
  it('renders a captioned, labelled table with one row per budget', async () => {
    const html = await render(SizeTable, {
      props: {
        compression: 'brotli',
        caption: 'Read from size-limit.',
        rows: [{ pkg: '@rxova/react-otp-input', entry: 'OtpInput', limitKb: 3 }],
      },
    })
    expect(html).toContain('role="region" aria-label="Bundle size budgets"')
    expect(html).toContain('<caption class="rx-sizes__caption">Read from size-limit.</caption>')
    expect(html).toContain('<th scope="col" class="rx-sizes__num">brotli</th>')
    expect(html).toContain('<th scope="row" class="rx-sizes__pkg">@rxova/react-otp-input</th>')
    expect(html).toContain('<td><code>OtpInput</code></td>')
    expect(html).toContain('<td class="rx-sizes__num">≤ 3 kB</td>')
  })
})
