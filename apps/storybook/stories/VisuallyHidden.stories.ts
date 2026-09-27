import VisuallyHidden from '@rxova/astro-ui/components/VisuallyHidden.astro'

import type { Meta, Story } from './types.ts'

const meta: Meta = {
  title: 'Primitives/VisuallyHidden',
  component: VisuallyHidden,
  tags: ['autodocs'],
  args: { slots: { default: ' of “A post”' } },
  decorators: [
    (story) => `<p>Read more${story() as string} (the rest of this sentence is only read out)</p>`,
  ],
}

export default meta

export const InASentence: Story = {}
