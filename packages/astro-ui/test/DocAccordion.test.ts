import { describe, expect, it } from "vitest";

import Accordion from "./fixtures/Accordion.astro";
import { render } from "./render.ts";

describe("DocAccordion", () => {
  it("renders each item as a details element, open only when asked", async () => {
    const html = await render(Accordion);
    expect(html).toMatch(/^<div class="doc-accordion">/);
    expect(html).toContain('<details class="doc-accordion-item" open>');
    expect(html).toContain('<details class="doc-accordion-item">');
    expect(html).toContain('<span class="title">Which factory?</span>');
    expect(html).toContain('<span class="summary-copy">Linear or graph</span>');
    expect(html).toContain("<p>Linear when the order is fixed.</p>");
    expect(html.match(/summary-copy/g)).toHaveLength(1);
  });
});
