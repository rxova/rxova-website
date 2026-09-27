import SiteFooter from '@rxova/astro-ui/components/SiteFooter.astro'

import type { Meta, Story } from './types.ts'

const meta: Meta = {
  title: 'Chrome/SiteFooter',
  component: SiteFooter,
  tags: ['autodocs'],
  args: { project: 'journey' },
}

export default meta

export const OnADocsSite: Story = {}

export const OnTheLanding: Story = {
  args: {
    project: undefined,
    docs: [
      { label: 'Getting started', href: '#' },
      { label: 'API', href: '#' },
    ],
  },
}
