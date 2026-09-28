import ValueGrid from "@rxova/astro-ui/components/ValueGrid.astro";

import type { Meta, Story } from "./types.ts";

const meta: Meta = {
  title: "Landing/ValueGrid",
  component: ValueGrid,
  tags: ["autodocs"],
  args: {
    items: [
      {
        icon: "braces",
        title: "Typed step IDs",
        body: "Invalid step names, events and transition targets are compile errors, not runtime bugs.",
      },
      {
        icon: "history",
        title: "Timeline history",
        body: "The runtime keeps the realized path, so <code>goToPreviousStep()</code> is deterministic.",
      },
      {
        icon: "timer",
        title: "Async guards",
        body: "Loading, failure, timeout and retry are part of flow behaviour.",
      },
      {
        icon: "blocks",
        title: "Plugins, not baggage",
        body: "Persistence, analytics and replay extend the machine without adding to the base cost.",
      },
      {
        icon: "unplug",
        title: "Zero dependencies",
        body: "Nothing to inherit and nothing to audit.",
      },
      {
        icon: "layers",
        title: "Framework-agnostic core",
        body: "The runtime is vanilla TypeScript; the React bindings are a thin separate package.",
      },
    ],
  },
};

export default meta;

export const SixClaims: Story = {};

export const ThreeClaims: Story = {
  args: {
    items: [
      {
        icon: "shield-check",
        title: "Maintained, in the open",
        body: "Changesets-driven releases and provenance-signed publishes.",
      },
      {
        icon: "feather",
        title: "Lightweight, and held to it",
        body: "Every package carries a size budget CI enforces.",
      },
      {
        icon: "accessibility",
        title: "Accessible by construction",
        body: "Native platform semantics do the work.",
      },
    ],
  },
};
