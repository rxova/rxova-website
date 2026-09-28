import { describe, expect, it } from "vitest";

import { SECTIONS } from "@rxova/brand";
import SectionNav from "../src/components/SectionNav.astro";
import { render } from "./render";

const links = (html: string) =>
  [...html.matchAll(/<a class="rx-sections__link" href="([^"]*)">\s*([^<]*?)\s*<\/a>/g)].map(
    (m) => [m[2], m[1]],
  );

describe("SectionNav", () => {
  it("links every rxova.org section absolutely by default, for a docs build served anywhere", async () => {
    expect(links(await render(SectionNav))).toEqual(
      SECTIONS.map((s) => [s.label, `https://rxova.org${s.path}`]),
    );
  });

  it("links root-relative when origin is ''", async () => {
    expect(links(await render(SectionNav, { props: { origin: "" } }))).toEqual(
      SECTIONS.map((s) => [s.label, s.path]),
    );
  });

  it("leads with the project switcher, marking the current project", async () => {
    const html = await render(SectionNav, { props: { current: "journey" } });
    expect(html.indexOf("rx-switcher")).toBeLessThan(html.indexOf("rx-sections__link"));
    expect(html).toContain('aria-label="rxova.org"');
    const current = /<a[^>]*class="[^"]*rx-switcher__current[^"]*"[^>]*>\s*([^<]*?)\s*</.exec(html);
    expect(current?.[1]).toBe("journey");
  });
});
