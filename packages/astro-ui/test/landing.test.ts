import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { beforeAll, describe, expect, it } from 'vitest'

import CodeRecipes from '../src/components/CodeRecipes.astro'
import CtaBand from '../src/components/CtaBand.astro'
import DataTable from '../src/components/DataTable.astro'
import ProofStats from '../src/components/ProofStats.astro'
import QuickStart from '../src/components/QuickStart.astro'
import Section from '../src/components/Section.astro'
import SizeTable from '../src/components/SizeTable.astro'
import ValueGrid from '../src/components/ValueGrid.astro'
import Accordion from './fixtures/Accordion.astro'
import Modes from './fixtures/Modes.astro'

let container: AstroContainer

beforeAll(async () => {
  container = await AstroContainer.create()
})

/** Drops Astro's inline `<script>` elements, so assertions see only the markup. Not a sanitizer. */
const withoutScripts = (html: string): string => {
  const start = html.indexOf('<script')
  if (start === -1) return html
  const end = html.indexOf('</script>', start) + '</script>'.length
  return withoutScripts(html.slice(0, start) + html.slice(end))
}

/** Rendered HTML without Astro's scope attributes, which change with the file's path, or its scripts. */
const render = async (
  component: Parameters<AstroContainer['renderToString']>[0],
  options: Parameters<AstroContainer['renderToString']>[1] = {},
) =>
  withoutScripts(
    (await container.renderToString(component, options)).replace(
      / data-astro-cid-[a-z0-9]+(="true")?/g,
      '',
    ),
  )

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

describe('CtaBand', () => {
  it('renders one pill per action, minimal by default, with a marker on external ones', async () => {
    const html = await render(CtaBand, {
      props: {
        title: 'Take it for a flow',
        lede: 'Start here.',
        actions: [
          { text: 'Start', href: '/start/', variant: 'primary' },
          { text: 'GitHub', href: 'https://github.com/rxova', external: true },
        ],
      },
    })
    expect(html).toContain('<h2 class="rx-cta__title">Take it for a flow</h2>')
    expect(html).toContain('<a class="rx-btn rx-btn--primary" href="/start/">Start</a>')
    expect(html).toMatch(
      /<a class="rx-btn rx-btn--minimal" href="https:\/\/github.com\/rxova" rel="noopener">GitHub<svg/,
    )
  })
})

describe('QuickStart', () => {
  it('shows the command with a copy button and frames the slotted snippet', async () => {
    const html = await render(QuickStart, {
      props: { command: 'npm i @rxova/journey-core' },
      slots: { default: '<pre>code</pre>' },
    })
    expect(html).toContain('aria-label="Install command"')
    expect(html).toContain(
      '<span class="rx-qs__prompt" aria-hidden="true">$</span>npm i @rxova/journey-core',
    )
    expect(html).toContain('data-copy="npm i @rxova/journey-core"')
    expect(html).toContain('<div class="rx-qs__code"><pre>code</pre></div>')
  })
})

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
    expect(html).toContain('<p class="rx-stats__value">MIT</p>')
    expect(html.match(/<li class="rx-stats__item">/g)).toHaveLength(2)
  })
})

describe('ValueGrid', () => {
  it('inlines the named Lucide icon and lets the body carry markup', async () => {
    const html = await render(ValueGrid, {
      props: {
        items: [
          { icon: 'braces', title: 'Typed', body: 'Invalid <code>ids</code> fail to compile.' },
        ],
      },
    })
    expect(html).toContain('aria-hidden="true"><path')
    expect(html).toContain('<h3 class="rx-vg__title">Typed</h3>')
    expect(html).toContain('<p class="rx-vg__body">Invalid <code>ids</code> fail to compile.</p>')
  })
})

describe('SizeTable', () => {
  it('renders a captioned, labelled table with one row per budget', async () => {
    const html = await render(SizeTable, {
      props: {
        compression: 'brotli',
        caption: 'Read from size-limit.',
        rows: [{ pkg: '@rxova/react-otp-input', entry: 'OtpInput', limitKb: 3 }],
      },
    })
    expect(html).toContain('aria-label="Bundle size budgets"')
    expect(html).toContain('<caption class="rx-sizes__caption">Read from size-limit.</caption>')
    expect(html).toContain('<th scope="col" class="rx-sizes__num">brotli</th>')
    expect(html).toContain('<td class="rx-sizes__num">≤ 3 kB</td>')
  })
})

describe('ModeTabs', () => {
  it('numbers the modes and places each named slot in its pane, empty when missing', async () => {
    const html = await render(Modes)
    expect(html).toContain('<span class="rx-modes__step" aria-hidden="true">1</span>')
    expect(html).toContain('<h3 class="rx-modes__name">Linear</h3>')
    expect(html).toContain('<div class="rx-modes__code"><pre>steps: []</pre></div>')
    expect(html).toContain('<div class="rx-modes__code"><pre>steps: graph</pre></div>')
    expect(html).toContain('<h3 class="rx-modes__name">Missing</h3>')
    expect(html).toContain('<div class="rx-modes__code"></div>')
  })
})

describe('DocAccordion', () => {
  it('renders each item as a details element, open only when asked', async () => {
    const html = await render(Accordion)
    expect(html).toMatch(/^<div class="doc-accordion">/)
    expect(html).toContain('<details class="doc-accordion-item" open>')
    expect(html).toContain('<details class="doc-accordion-item">')
    expect(html).toContain('<span class="title">Which factory?</span>')
    expect(html).toContain('<span class="summary-copy">Linear or graph</span>')
    expect(html).toContain('<p>Linear when the order is fixed.</p>')
  })
})

describe('CodeRecipes', () => {
  it('renders a linked heading and the source for each recipe, ids under the prefix', async () => {
    const html = await render(CodeRecipes, {
      props: {
        idPrefix: 'integration',
        recipes: [
          { id: 'mui', label: 'Material UI', href: 'https://mui.com', source: 'const a = 1' },
        ],
      },
    })
    expect(html).toContain(
      '<h3 id="integration-mui"><a href="https://mui.com">Material UI</a></h3>',
    )
    expect(html).toContain('<code>const a = 1</code>')
  })

  it('defaults the id prefix to recipe', async () => {
    const html = await render(CodeRecipes, {
      props: { recipes: [{ id: 'x', label: 'X', href: '/x', source: '' }] },
    })
    expect(html).toContain('id="recipe-x"')
  })
})

describe('DataTable', () => {
  it('renders the columns, a row heading per row and code cells as code', async () => {
    const html = await render(DataTable, {
      props: {
        columns: ['Framework', 'Range', 'Path'],
        rows: [{ label: 'Next.js', cells: [{ code: '^16' }, 'App Router'] }],
      },
    })
    expect(html).toContain('<div class="sl-table-wrapper"><table><thead><tr><th>Framework</th>')
    expect(html).toContain(
      '<th scope="row">Next.js</th><td><code>^16</code></td><td>App Router</td>',
    )
  })
})
