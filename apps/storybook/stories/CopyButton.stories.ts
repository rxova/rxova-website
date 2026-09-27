import CopyButton from '@rxova/astro-ui/components/CopyButton.astro'

import type { Meta, Story } from './types.ts'

const meta: Meta = {
  title: 'Primitives/CopyButton',
  component: CopyButton,
  tags: ['autodocs'],
  args: { text: 'pnpm add @rxova/journey-core', label: 'Copy the install command' },
}

export default meta

export const OnThePage: Story = {}

/** Drawn in `currentColor`, so it reads on a dark terminal in either theme. */
export const OnATerminal: Story = {
  decorators: [
    (story) =>
      `<div style="display:flex;align-items:center;gap:.6rem;padding:.4rem .45rem .4rem .9rem;border-radius:8px;background:#14140f;color:#f4f1ea;font-family:var(--rx-font-mono);font-size:.85rem"><span style="opacity:.6">$</span><code style="flex:1">pnpm add @rxova/journey-core</code>${story() as string}</div>`,
  ],
}
