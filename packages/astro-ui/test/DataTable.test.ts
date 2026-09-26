import { describe, expect, it } from 'vitest'

import DataTable from '../src/components/DataTable.astro'
import { render } from './render.ts'

describe('DataTable', () => {
  it('renders a labelled, framed table with column headings, row headings and code cells', async () => {
    const html = await render(DataTable, {
      props: {
        label: 'Framework compatibility',
        columns: ['Framework', 'Range', 'Path'],
        rows: [{ label: 'Next.js', cells: [{ code: '^16' }, 'App Router'] }],
      },
    })
    expect(html).toMatch(
      /^<div class="rx-table" tabindex="0" role="region" aria-label="Framework compatibility">/,
    )
    expect(html).toContain('<thead><tr><th scope="col">Framework</th><th scope="col">Range</th>')
    expect(html).toContain('<th scope="row" class="rx-table__label">Next.js</th>')
    expect(html).toContain('<td><code>^16</code></td><td>App Router</td>')
    expect(html).not.toContain('<caption')
  })

  it('puts the caption under the table when given one', async () => {
    const html = await render(DataTable, {
      props: { label: 'Sizes', columns: ['A'], rows: [], caption: 'Read at build time.' },
    })
    expect(html).toContain('<caption class="rx-table__caption">Read at build time.</caption>')
  })
})
