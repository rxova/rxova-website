import { baseKnipConfig } from "@rxova/repo-config/knip";

export default baseKnipConfig({
  docsApp: false,
  // Reached by path rather than import (CSS url()s, a resolved SVG, Storybook's builder), or,
  // for docs-kit, installed at the root for the docs sites before anything here imports it.
  ignoreDependencies: [
    "@fontsource/ibm-plex-mono",
    "@fontsource/space-grotesk",
    "lucide-static",
    "@storybook/builder-vite",
    "@rxova/docs-kit",
  ],
  // Displayed code, not imported: the walkthroughs, and the gallery's code-recipe samples.
  ignore: [
    "apps/site/src/showcases/*/after.*",
    "apps/preview/src/content/docs/gallery/code-recipes.mdx",
  ],
});
