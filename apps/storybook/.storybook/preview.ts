import '@rxova/brand/fonts.css'
import '@rxova/astro-ui/styles/document.css'

import type { AstroRenderer } from '@storybook-astro/framework'
import { GLOBALS_UPDATED } from 'storybook/internal/core-events'
import type { ProjectAnnotations } from 'storybook/internal/types'
import { addons } from 'storybook/preview-api'

/** The theme toolbar sets `data-theme` on the document, the attribute `tokens.css` reads; browser only, since the static build runs this in Node. */
if (typeof document !== 'undefined') {
  addons.getChannel().on(GLOBALS_UPDATED, ({ globals }: { globals: { theme?: string } }) => {
    document.documentElement.dataset.theme = globals.theme ?? 'light'
  })
}

const preview: ProjectAnnotations<AstroRenderer> = {
  parameters: {
    layout: 'padded',
    backgrounds: { disable: true },
  },
  globalTypes: {
    theme: {
      description: 'Colour scheme',
      toolbar: {
        title: 'Theme',
        icon: 'contrast',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'light' },
}

export default preview
