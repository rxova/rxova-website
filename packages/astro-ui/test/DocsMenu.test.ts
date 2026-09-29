import { describe, expect, it } from "vitest";

import { PROJECTS, SECTIONS } from "@rxova/brand";
import DocsMenu from "../src/components/DocsMenu.astro";
import { render } from "./render";

const links = (html: string, list: string) => {
  const block = new RegExp(`<ul[^>]*aria-label="${list}"[^>]*>([\\s\\S]*?)</ul>`).exec(html)?.[1];
  return [...(block ?? "").matchAll(/<a([^>]*)>\s*([^<]*?)\s*<\/a>/g)].map((m) => ({
    label: m[2],
    href: /href="([^"]*)"/.exec(m[1] ?? "")?.[1],
    current: /aria-current="page"/.test(m[1] ?? ""),
  }));
};

describe("DocsMenu", () => {
  it("lists every project's docs, then the sections the rxova.dev header shows", async () => {
    const html = await render(DocsMenu);
    expect(links(html, "Docs").map((l) => [l.label, l.href])).toEqual(
      PROJECTS.map((p) => [p.label, `https://rxova.dev${p.mount}`]),
    );
    expect(links(html, "Site").map((l) => [l.label, l.href])).toEqual(
      SECTIONS.map((s) => [s.label, `https://rxova.dev${s.path}`]),
    );
    expect(html.indexOf('aria-label="Docs"')).toBeLessThan(html.indexOf('aria-label="Site"'));
  });

  it("marks only the current project", async () => {
    const html = await render(DocsMenu, { props: { current: "use-everywhere" } });
    expect(
      links(html, "Docs")
        .filter((l) => l.current)
        .map((l) => l.label),
    ).toEqual(["use-everywhere"]);
    expect(links(html, "Site").some((l) => l.current)).toBe(false);
  });

  it("marks nothing on a standalone build", async () => {
    expect(links(await render(DocsMenu), "Docs").some((l) => l.current)).toBe(false);
  });

  it("links root-relative when origin is ''", async () => {
    const html = await render(DocsMenu, { props: { origin: "" } });
    expect(links(html, "Site").map((l) => l.href)).toEqual(SECTIONS.map((s) => s.path));
  });
});
