import CtaBand from '@rxova/astro-ui/components/CtaBand.astro'

import type { Meta, Story } from './types.ts'

const meta: Meta = {
  title: 'Landing/CtaBand',
  component: CtaBand,
  tags: ['autodocs'],
  args: {
    title: 'Model the flow, not the click handlers',
    lede: 'Install the core and have a running machine in about eight lines. The React bindings are a separate package; take them when you want them.',
    actions: [
      { text: 'Start with Core', href: '#', variant: 'primary' },
      { text: 'React quickstart', href: '#' },
      { text: 'GitHub', href: 'https://github.com/rxova', external: true },
    ],
  },
}

export default meta

export const Opener: Story = {}

export const Closer: Story = {
  args: {
    title: 'Take it for a flow',
    lede: 'Start with the quickstart, or read how the transition graph resolves before you commit to it.',
    actions: [
      {
        text: 'Star on GitHub',
        href: 'https://github.com/rxova',
        variant: 'primary',
        external: true,
      },
      { text: 'Read the docs', href: '#' },
    ],
  },
}
