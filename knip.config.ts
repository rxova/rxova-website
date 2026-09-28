import { baseKnipConfig } from '@rxova/repo-config/knip'

export default baseKnipConfig({
  docsApp: false,
  // Reached by path rather than import (CSS url()s, a resolved SVG, Storybook's builder), or,
  // for docs-kit, installed at the root for the docs sites before anything here imports it.
  ignoreDependencies: [
    '@fontsource/ibm-plex-mono',
    '@fontsource/space-grotesk',
    'lucide-static',
    '@storybook/builder-vite',
    '@rxova/docs-kit',
  ],
  // The walkthroughs' code is displayed, not imported.
  ignore: ['apps/site/src/showcases/*/after.*'],
})
