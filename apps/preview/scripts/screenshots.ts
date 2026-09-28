/** Builds the preview, then screenshots every gallery page in both colour schemes. Usage: `pnpm screenshots`. */
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

import { chromium } from "@playwright/test";

import { SCHEMES, freePort, readGallerySlugs, shotFile, waitFor } from "./gallery.ts";

const app = resolve(import.meta.dirname, "..");
const out = resolve(app, "../../packages/astro-ui/screenshots");

async function main(): Promise<void> {
  const build = spawnSync("pnpm", ["exec", "astro", "build"], { cwd: app, stdio: "inherit" });
  if (build.status !== 0) process.exit(build.status ?? 1);

  const port = await freePort();
  const origin = `http://localhost:${port}`;
  // Its own process group, since preview forks a server the kill below must reach; the lock would
  // refuse to start beside a preview running elsewhere, and this one has its own port.
  const server = spawn(
    "pnpm",
    ["exec", "astro", "preview", "--port", String(port), "--ignore-lock"],
    { cwd: app, stdio: "ignore", detached: true },
  );
  try {
    await waitFor(`${origin}/gallery/`);
    console.log(`serving ${origin}`);
    mkdirSync(out, { recursive: true });
    const browser = await chromium.launch();
    for (const scheme of SCHEMES) {
      const context = await browser.newContext({
        colorScheme: scheme,
        reducedMotion: "reduce",
        viewport: { width: 1280, height: 900 },
        deviceScaleFactor: 2,
      });
      const page = await context.newPage();
      for (const slug of readGallerySlugs(resolve(app, "src/content/docs/gallery"))) {
        const response = await page.goto(`${origin}/gallery/${slug}/`);
        if (response?.status() !== 200) throw new Error(`/gallery/${slug}/ is not a page`);
        await page.evaluate(() => document.fonts.ready);
        const file = shotFile(out, slug, scheme);
        await page
          .locator(".sl-markdown-content")
          .screenshot({ path: file, animations: "disabled" });
        console.log(`✓ ${file}`);
      }
      await context.close();
    }
    await browser.close();
  } finally {
    process.kill(-(server.pid ?? 0), "SIGTERM");
  }
}

if (import.meta.main) await main();
