import Header from "@rxova/astro-ui/components/Header.astro";

import type { Meta, Story } from "./types.ts";

const meta: Meta = {
  title: "Chrome/Header",
  component: Header,
  tags: ["autodocs"],
  args: {
    homeHref: "#",
    logoSrc: "https://rxova.dev/rxova-logo-256.png",
    items: [
      { label: "Projects", href: "#", current: true },
      { label: "Blog", href: "#" },
      { label: "Updates", href: "#" },
      { label: "About", href: "#" },
    ],
  },
};

export default meta;

export const Default: Story = {};
