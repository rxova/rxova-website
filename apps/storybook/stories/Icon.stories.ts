import Collapse from "@rxova/astro-ui/components/icons/Collapse.astro";
import Expand from "@rxova/astro-ui/components/icons/Expand.astro";
import Next from "@rxova/astro-ui/components/icons/Next.astro";
import Pause from "@rxova/astro-ui/components/icons/Pause.astro";
import Play from "@rxova/astro-ui/components/icons/Play.astro";
import Prev from "@rxova/astro-ui/components/icons/Prev.astro";
import Replay from "@rxova/astro-ui/components/icons/Replay.astro";
import Icon from "@rxova/astro-ui/components/Icon.astro";

import type { Meta, Story } from "./types.ts";

const glyphs = { Collapse, Expand, Next, Pause, Play, Prev, Replay };

const meta: Meta = {
  title: "Primitives/Icon",
  component: Icon,
  tags: ["autodocs"],
  args: { size: 16, solid: false },
};

export default meta;

/** Every glyph in `icons/`, at the size and fill the controls set. */
export const AllGlyphs: Story = {
  render: (args) => ({
    component: Icon,
    props: {},
    slots: {
      default: Object.values(glyphs).map((component) => ({
        component,
        props: { size: args.size, solid: args.solid },
        slots: {},
      })),
    },
  }),
  decorators: [
    (story) => `<div style="display:flex;gap:1rem;align-items:center">${story() as string}</div>`,
  ],
};

export const Large: Story = { ...AllGlyphs, args: { size: 32 } };
export const Solid: Story = { ...AllGlyphs, args: { size: 24, solid: true } };
