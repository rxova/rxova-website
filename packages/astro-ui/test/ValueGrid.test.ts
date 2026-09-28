import { describe, expect, it } from "vitest";

import ValueGrid from "../src/components/ValueGrid.astro";
import { render } from "./render.ts";

describe("ValueGrid", () => {
  it("inlines the named Lucide icon and lets the body carry markup", async () => {
    const html = await render(ValueGrid, {
      props: {
        items: [
          { icon: "braces", title: "Typed", body: "Invalid <code>ids</code> fail to compile." },
        ],
      },
    });
    expect(html).toMatch(/<svg class="rx-vg__icon"[^>]*aria-hidden="true"><path/);
    expect(html).toContain('<h3 class="rx-vg__title">Typed</h3>');
    expect(html).toContain('<p class="rx-vg__body">Invalid <code>ids</code> fail to compile.</p>');
  });

  it("renders one item per entry", async () => {
    const html = await render(ValueGrid, {
      props: {
        items: [
          { icon: "timer", title: "A", body: "a" },
          { icon: "layers", title: "B", body: "b" },
        ],
      },
    });
    expect(html.match(/<li class="rx-vg__item">/g)).toHaveLength(2);
  });
});
