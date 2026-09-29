import { describe, expect, it } from "vitest";

import SiteFooter from "../src/components/SiteFooter.astro";
import { render } from "./render";

const hrefs = (html: string) => [...html.matchAll(/<a[^>]*href="([^"]*)"/g)].map((m) => m[1]);

describe("SiteFooter", () => {
  it("links rxova.dev absolutely by default, for a docs site on another origin", async () => {
    const links = hrefs(await render(SiteFooter));
    expect(links).toContain("https://rxova.dev/");
    expect(links).toContain("https://rxova.dev/blog/");
    expect(links).toContain("https://rxova.dev/privacy/");
    expect(links).toContain("https://rxova.dev/packages/journey/");
  });

  it("links root-relative when origin is '', so a preview links to itself", async () => {
    const html = await render(SiteFooter, { props: { origin: "" } });
    const own = hrefs(html).filter((h) => !/^(https?:|mailto:)/.test(h ?? ""));
    expect(own).toEqual(expect.arrayContaining(["/", "/projects/", "/blog/", "/terms/"]));
    expect(html).not.toContain("https://rxova.dev");
    expect(html).toContain('src="/rxova-logo-256.png"');
  });

  it("ends every rxova.dev page link in a slash, which Pages serves without a redirect", async () => {
    for (const origin of ["", "https://rxova.dev"]) {
      const own = hrefs(await render(SiteFooter, { props: { origin } })).filter(
        (h) => h === `${origin}/` || (h ?? "").startsWith(`${origin}/`),
      );
      for (const href of own) expect(href, href).toMatch(/\/$/);
    }
  });
});
