import CodeRecipes from "@rxova/astro-ui/components/CodeRecipes.astro";

import type { Meta, Story } from "./types.ts";

const meta: Meta = {
  title: "Docs/CodeRecipes",
  component: CodeRecipes,
  tags: ["autodocs"],
  args: {
    idPrefix: "integration",
    recipes: [
      {
        id: "shadcn",
        label: "shadcn/ui",
        href: "https://ui.shadcn.com/docs",
        source:
          "import { OtpInput } from '@rxova/react-otp-input'\n\nexport function OtpField() {\n  return <OtpInput length={6} className=\"flex gap-2\" />\n}",
      },
      {
        id: "mui",
        label: "Material UI",
        href: "https://mui.com/material-ui/getting-started/",
        source:
          "import { OtpInput } from '@rxova/react-otp-input'\nimport { FormControl, FormLabel } from '@mui/material'\n\nexport function OtpField() {\n  return (\n    <FormControl>\n      <FormLabel>One-time code</FormLabel>\n      <OtpInput length={6} />\n    </FormControl>\n  )\n}",
      },
    ],
  },
};

export default meta;

export const TwoRecipes: Story = {};

export const OneRecipe: Story = {
  args: {
    idPrefix: "recipe",
    recipes: [
      {
        id: "plain",
        label: "Plain React",
        href: "https://react.dev",
        source:
          "import { OtpInput } from '@rxova/react-otp-input'\n\nexport const Field = () => <OtpInput length={6} />",
      },
    ],
  },
};
