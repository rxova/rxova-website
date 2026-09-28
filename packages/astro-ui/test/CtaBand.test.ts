import { describe, expect, it } from "vitest";

import CtaBand from "../src/components/CtaBand.astro";
import { render } from "./render.ts";

describe("CtaBand", () => {
  it("renders one pill per action, minimal by default, with a marker on external ones", async () => {
    const html = await render(CtaBand, {
      props: {
        title: "Take it for a flow",
        lede: "Start here.",
        actions: [
          { text: "Start", href: "/start/", variant: "primary" },
          { text: "GitHub", href: "https://github.com/rxova", external: true },
        ],
      },
    });
    expect(html).toContain('<h2 class="rx-cta__title">Take it for a flow</h2>');
    expect(html).toContain('<p class="rx-cta__lede">Start here.</p>');
    expect(html).toContain('<a class="rx-btn rx-btn--primary" href="/start/">Start</a>');
    expect(html).toMatch(
      /<a class="rx-btn rx-btn--minimal" href="https:\/\/github.com\/rxova" rel="noopener">GitHub<svg/,
    );
  });
});
