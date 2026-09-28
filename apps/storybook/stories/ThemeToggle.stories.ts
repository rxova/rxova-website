import ThemeToggle from "@rxova/astro-ui/components/ThemeToggle.astro";

import type { Meta, Story } from "./types.ts";

const meta: Meta = {
  title: "Chrome/ThemeToggle",
  component: ThemeToggle,
  tags: ["autodocs"],
  args: { floating: false },
};

export default meta;

export const InAHeader: Story = {};

export const Floating: Story = { args: { floating: true } };
