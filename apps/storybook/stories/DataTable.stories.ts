import DataTable from "@rxova/astro-ui/components/DataTable.astro";

import type { Meta, Story } from "./types.ts";

const meta: Meta = {
  title: "Docs/DataTable",
  component: DataTable,
  tags: ["autodocs"],
  args: {
    label: "Framework compatibility",
    caption: "Read from the fixture manifests when this page was built.",
    columns: ["Framework", "Tested dependency range", "Rendering path", "Browser proof"],
    rows: [
      {
        label: "Next.js",
        cells: [
          { code: "^16.0.0" },
          "App Router, server and client components",
          "Chromium, hydrated",
        ],
      },
      { label: "Remix", cells: [{ code: "^2.15.0" }, "Route modules, SSR", "Chromium, hydrated"] },
      { label: "Vite", cells: [{ code: "^8.0.0" }, "Client only", "Chromium"] },
    ],
  },
};

export default meta;

export const FrameworkMatrix: Story = {};

export const NoCaption: Story = {
  args: {
    label: "Browsers",
    caption: undefined,
    columns: ["Browser", "Engine"],
    rows: [
      { label: "Chromium", cells: ["Blink"] },
      { label: "Firefox", cells: ["Gecko"] },
    ],
  },
};
