import type { StorybookConfig } from "@storybook-astro/framework";

// Static: every story is rendered at build time, so the output is a plain tree like the docs sites.
const config: StorybookConfig = {
  stories: ["../stories/**/*.stories.ts"],
  addons: ["@storybook/addon-docs"],
  framework: {
    name: "@storybook-astro/framework",
    options: { renderMode: "static", fonts: [] },
  },
};

export default config;
