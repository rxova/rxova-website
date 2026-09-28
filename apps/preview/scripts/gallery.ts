/** What the screenshot script decides without a browser: which pages, which files, which port, and the wait. */
import { readdirSync } from "node:fs";
import { createServer, type AddressInfo } from "node:net";
import { resolve } from "node:path";

export type Scheme = "light" | "dark";
export const SCHEMES: readonly Scheme[] = ["light", "dark"];

/** The gallery's component pages: every `.mdx` but the index, as sorted slugs. */
export function gallerySlugs(files: readonly string[]): string[] {
  return files
    .filter((file) => file.endsWith(".mdx") && file !== "index.mdx")
    .map((file) => file.replace(/\.mdx$/, ""))
    .sort();
}

export const readGallerySlugs = (dir: string): string[] => gallerySlugs(readdirSync(dir));

/** `<out>/<slug>.png`, or `<slug>-dark.png` for the dark scheme. */
export function shotFile(out: string, slug: string, scheme: Scheme): string {
  return resolve(out, `${slug}${scheme === "dark" ? "-dark" : ""}.png`);
}

export const fetchOk = (url: string): Promise<boolean> =>
  fetch(url)
    .then((r) => r.ok)
    .catch(() => false);

export interface WaitOptions {
  attempts?: number;
  delayMs?: number;
  probe?: (url: string) => Promise<boolean>;
}

/** Resolves once `probe` reports the URL up; throws after `attempts` tries. */
export async function waitFor(
  url: string,
  { attempts = 100, delayMs = 200, probe = fetchOk }: WaitOptions = {},
): Promise<void> {
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (await probe(url)) return;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  throw new Error(`${url} did not come up after ${attempts} attempts`);
}

/** A port nothing listens on: Astro moves to the next free port silently, which would hand a parallel run another run's server. */
export function freePort(): Promise<number> {
  return new Promise((done, fail) => {
    const server = createServer();
    server.once("error", fail);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as AddressInfo;
      server.close(() => done(port));
    });
  });
}
