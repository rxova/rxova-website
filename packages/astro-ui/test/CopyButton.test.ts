import { describe, expect, it } from "vitest";

import CopyButton from "../src/components/CopyButton.astro";
import { render } from "./render.ts";

describe("CopyButton", () => {
  it("is an icon button: the text to copy, a name for screen readers, two glyphs, no visible words", async () => {
    const html = await render(CopyButton, { props: { text: "npm i ts-extended-errors" } });
    expect(html).toMatch(
      /^<button class="rx-copy" type="button" data-rx-copy="npm i ts-extended-errors" aria-label="Copy" title="Copy">/,
    );
    expect(html).toContain('class="icon rx-copy__idle"');
    expect(html).toContain('class="icon rx-copy__done"');
    expect(html).toContain('<span class="rx-copy__status" role="status"></span>');
    // No text between any two tags: the glyphs are the only thing a sighted reader sees.
    expect(html).not.toMatch(/>\s*[^<\s][^<]*</);
  });

  it('takes a more specific name when "Copy" alone would not say what is copied', async () => {
    const html = await render(CopyButton, {
      props: { text: "x", label: "Copy the install command" },
    });
    expect(html).toContain(
      'aria-label="Copy the install command" title="Copy the install command"',
    );
  });
});
