import ProjectSwitcher from '@rxova/astro-ui/components/ProjectSwitcher.astro'

import type { Meta, Story } from './types.ts'

const meta: Meta = {
  title: 'Chrome/ProjectSwitcher',
  component: ProjectSwitcher,
  tags: ['autodocs'],
  args: { current: 'journey' },
}

export default meta

export const OnADocsSite: Story = {}

export const NoCurrent: Story = { args: { current: undefined } }
