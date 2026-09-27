import ProofStats from '@rxova/astro-ui/components/ProofStats.astro'

import type { Meta, Story } from './types.ts'

const meta: Meta = {
  title: 'Landing/ProofStats',
  component: ProofStats,
  tags: ['autodocs'],
  args: {
    stats: [
      { value: '0', label: 'Runtime dependencies', note: 'Across every published package' },
      {
        value: '7.58 kB',
        label: 'Core, brotli',
        note: 'Measured by size-limit on the built output',
      },
      {
        value: '95%',
        label: 'Coverage floor, per file',
        note: 'Statements, branches, functions and lines',
      },
      { value: '3', label: 'Engines under E2E', note: 'Chromium, Firefox, WebKit' },
      { value: '4', label: 'Published packages', note: 'Each independently installable' },
      {
        value: 'MIT',
        label: 'Licensed, every package',
        note: 'Use it at work without asking anyone',
      },
    ],
  },
}

export default meta

export const SixStats: Story = {}

export const FiveStats: Story = {
  args: {
    stats: [
      { value: '0', label: 'Runtime dependencies', note: 'react is the only peer' },
      { value: '10 kB', label: 'Whole suite, brotli', note: 'Enforced by size-limit in CI' },
      { value: '95%', label: 'Coverage floor', note: 'Per file' },
      { value: '0', label: 'Accessibility violations', note: 'axe-core against WCAG 2.1 AA' },
      { value: 'MIT', label: 'Licence', note: 'Permissive and unchanged' },
    ],
  },
}
