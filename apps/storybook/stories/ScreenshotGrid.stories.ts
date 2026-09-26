import ScreenshotGrid from '@rxova/astro-ui/components/ScreenshotGrid.astro'
import card from '@rxova/brand/assets/og/journey.png'

import type { Meta, Story } from './types.ts'

const meta: Meta = {
  title: 'Landing/ScreenshotGrid',
  component: ScreenshotGrid,
  tags: ['autodocs'],
  args: {
    shots: [
      {
        src: card,
        alt: 'The journey social card',
        title: 'Timeline and state',
        body: 'The realized timeline, the current step, and the context behind it.',
      },
      {
        src: card,
        alt: 'The journey social card',
        title: 'Transition log',
        body: 'Every event, the transition it matched, and the diff it committed.',
      },
      {
        src: card,
        alt: 'The journey social card',
        title: 'Live commands',
        body: 'Send events into the running machine and watch the snapshot answer.',
      },
    ],
    link: {
      href: 'https://chromewebstore.google.com/',
      text: 'Get it from the Chrome Web Store',
      external: true,
    },
  },
}

export default meta

export const ThreeShotsAndALink: Story = {}

export const TwoShotsNoLink: Story = {
  args: {
    shots: [
      { src: card, alt: 'The journey social card', title: 'Before', body: 'The flow as a list.' },
      { src: card, alt: 'The journey social card', title: 'After', body: 'The flow as a graph.' },
    ],
    link: undefined,
  },
}
