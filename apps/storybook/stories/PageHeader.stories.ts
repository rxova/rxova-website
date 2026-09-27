import PageHeader from '@rxova/astro-ui/components/PageHeader.astro'

import type { Meta, Story } from './types.ts'

const meta: Meta = {
  title: 'Primitives/PageHeader',
  component: PageHeader,
  tags: ['autodocs'],
  args: {
    title: 'Updates',
    variant: 'index',
    measure: 'wide',
    slots: { default: 'What moved in each repository, newest first.' },
  },
}

export default meta

export const Index: Story = {}

export const Detail: Story = {
  args: {
    title: 'journey',
    variant: 'detail',
    measure: 'narrow',
    back: { href: '#', label: 'All repos' },
    slots: { default: 'Declarative journey graphs for non-linear UI flows.' },
  },
}
