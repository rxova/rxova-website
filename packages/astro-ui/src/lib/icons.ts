/** Lucide icons as inline markup, read from `lucide-static` at build time so nothing ships to the client. */

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/** What sits inside a Lucide icon's root `<svg>`, so the caller's own element owns size and accessibility. */
export function lucideGlyph(name: string): string {
  const svg = readFileSync(require.resolve(`lucide-static/icons/${name}.svg`), "utf8");
  return svg
    .replace(/^[\s\S]*?<svg[^>]*>/, "")
    .replace(/<\/svg>[\s\S]*$/, "")
    .trim();
}
