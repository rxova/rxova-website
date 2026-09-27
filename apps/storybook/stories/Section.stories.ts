import Section from '@rxova/astro-ui/components/Section.astro'

import type { Meta, Story } from './types.ts'

const meta: Meta = {
  title: 'Landing/Section',
  component: Section,
  tags: ['autodocs'],
  args: {
    eyebrow: 'Why this one',
    title: 'Explicit enough for real flows, small enough to stay practical',
    lede: 'A short list of inputs, each taken all the way: formatting, caret behaviour, accessibility and native form support treated as the whole job.',
    accent: false,
    slots: { default: '<p>Slotted prose after the header takes the muted body style.</p>' },
  },
}

export default meta

export const Default: Story = {}

export const Accent: Story = {
  args: { accent: true, eyebrow: 'Proof', title: 'Numbers you can go and check', lede: undefined },
}

export const TitleOnly: Story = {
  args: { eyebrow: undefined, lede: undefined, title: 'One import to your first input', slots: {} },
}
