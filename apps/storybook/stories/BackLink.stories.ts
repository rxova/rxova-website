import BackLink from "@rxova/astro-ui/components/BackLink.astro";

import type { Meta, Story } from "./types.ts";

const meta: Meta = {
  title: "Primitives/BackLink",
  component: BackLink,
  tags: ["autodocs"],
  args: { href: "#", slots: { default: "Blog" } },
};

export default meta;

export const Default: Story = {};
