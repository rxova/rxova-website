import ShowMore from "@rxova/astro-ui/components/ShowMore.astro";

import type { Meta, Story } from "./types.ts";

/** Ships `hidden` until `enhanceShowMore` drives it; the story unhides it so the controls can be seen. */
const meta: Meta = {
  title: "Primitives/ShowMore",
  component: ShowMore,
  tags: ["autodocs"],
  args: { noun: "posts" },
  decorators: [
    (story) => `<style>[data-reveal-controls][hidden]{display:flex}</style>${story() as string}`,
  ],
};

export default meta;

export const Default: Story = {};
