import QuickStart from "@rxova/astro-ui/components/QuickStart.astro";

import type { Meta, Story } from "./types.ts";

const snippet = `<pre><code>import { createLinearJourney } from '@rxova/journey-core'

const machine = createLinearJourney({
  context: { name: '' },
  steps: ['account', 'review'],
})

await machine.navigate.goToNextStep()</code></pre>`;

const meta: Meta = {
  title: "Landing/QuickStart",
  component: QuickStart,
  tags: ["autodocs"],
  args: { command: "npm i @rxova/journey-core", slots: { default: snippet } },
};

export default meta;

export const CommandBesideSnippet: Story = {};

export const LongCommand: Story = {
  args: {
    command:
      "pnpm add @rxova/react-otp-input @rxova/react-rating-input @rxova/react-intl-currency-input @rxova/react-phone-input",
    slots: { default: "<pre><code>import { OtpInput } from '@rxova/react-otp-input'</code></pre>" },
  },
};
