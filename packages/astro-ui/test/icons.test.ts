import { describe, expect, it } from "vitest";

import { lucideGlyph } from "../src/lib/icons.ts";

describe("lucideGlyph", () => {
  it("returns what is inside the icon, without the root svg element", () => {
    const glyph = lucideGlyph("braces");
    expect(glyph).toContain("<path");
    expect(glyph).not.toContain("<svg");
    expect(glyph).not.toContain("</svg>");
    expect(glyph).not.toContain("lucide");
  });

  it("throws for an icon lucide does not ship", () => {
    expect(() => lucideGlyph("not-an-icon")).toThrow(/not-an-icon\.svg/);
  });
});
