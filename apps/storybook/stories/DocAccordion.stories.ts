import DocAccordion from "@rxova/astro-ui/components/DocAccordion.astro";
import DocAccordionItem from "@rxova/astro-ui/components/DocAccordionItem.astro";

import type { Meta, Story } from "./types.ts";

const item = (title: string, body: string, extra: Record<string, unknown> = {}) => ({
  component: DocAccordionItem,
  props: { title, ...extra },
  slots: { default: `<p>${body}</p>` },
});

const meta: Meta = {
  title: "Docs/DocAccordion",
  component: DocAccordion,
  tags: ["autodocs"],
  args: {
    slots: {
      default: [
        item(
          "Which factory should I use?",
          "Use the linear one when declared order is the default forward path, and the graph one when named events or guards choose the destination.",
          { summary: "Linear or graph", defaultOpen: true },
        ),
        item(
          "Does reaching the last step complete the journey?",
          "No. Completion is a product decision, so it is called explicitly.",
        ),
        item(
          "How does back work?",
          "It moves the realized timeline pointer. It does not search the definition or send a graph event.",
        ),
      ],
    },
  },
};

export default meta;

export const Faq: Story = {};

export const AllClosed: Story = {
  args: {
    slots: {
      default: [item("First", "One."), item("Second", "Two.", { summary: "With a summary line" })],
    },
  },
};
