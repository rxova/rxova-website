import ModeTabs from '@rxova/astro-ui/components/ModeTabs.astro'

import type { Meta, Story } from './types.ts'

const meta: Meta = {
  title: 'Landing/ModeTabs',
  component: ModeTabs,
  tags: ['autodocs'],
  args: {
    modes: [
      {
        name: 'Linear',
        slot: 'linear',
        summary:
          'A fixed sequence. Use the array shorthand when every step just goes to the next one.',
      },
      {
        name: 'Graph',
        slot: 'graph',
        summary:
          'Branching, retries and conditional routing. Keyed by step, then by event, matched in order.',
      },
    ],
    slots: {
      linear: `<pre><code>steps: ['account', 'details', 'payment', 'review']</code></pre>`,
      graph: `<pre><code>steps: {
  login: {
    on: {
      submit: [
        { to: 'admin', when: ({ context }) => context.role === 'admin' },
        { to: 'dashboard' },
      ],
    },
  },
}</code></pre>`,
    },
  },
}

export default meta

export const TwoModes: Story = {}

export const MissingSlot: Story = {
  args: {
    modes: [
      { name: 'Linear', slot: 'linear', summary: 'Has a pane.' },
      {
        name: 'Headless',
        slot: 'headless',
        summary: 'Names a slot the page did not fill: an empty pane, not a failure.',
      },
    ],
  },
}
