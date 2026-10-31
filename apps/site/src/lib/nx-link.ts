/** What /apps/nx-link is built from. The page ships before the listing exists, so every
 * download link derives from `APP_STORE_URL`: setting it is the whole launch-day edit. */

import { existsSync } from "node:fs";
import type { ImageMetadata } from "astro";

/** The listing, once Apple has one. `null` until then. */
export const APP_STORE_URL: string | null = null;

export const SUPPORT_EMAIL = "jonyk@rxova.dev";

export interface Screenshot {
  src: ImageMetadata;
  alt: string;
  title: string;
  body: string;
}

/** The caption under each screenshot, keyed by the file name the capture script writes. */
export const SHOT_COPY: Record<string, { title: string; body: string }> = {
  "01-connect": {
    title: "Connect",
    body: "Join the camera's Wi-Fi and the app finds it on its own.",
  },
  "02-gallery": {
    title: "The card",
    body: "Everything on the camera, as a grid, with thumbnails cached between sessions.",
  },
  "03-selection": {
    title: "Pick",
    body: "Tap what you want. The bar counts the files and what they weigh.",
  },
  "04-transfer": {
    title: "Transfer",
    body: "Full-resolution originals, straight into the photo library.",
  },
};

/** Captured files paired with their captions, in file-name order. One with no caption is
 * dropped rather than shown bare. */
export function buildScreenshots(
  modules: Record<string, { default: ImageMetadata }>,
  copy: Record<string, { title: string; body: string }> = SHOT_COPY,
): readonly Screenshot[] {
  return Object.entries(modules)
    .sort(([left], [right]) => left.localeCompare(right))
    .flatMap(([path, module]) => {
      const name = path.slice(path.lastIndexOf("/") + 1).replace(/\.png$/, "");
      const caption = copy[name];
      return caption
        ? [{ src: module.default, alt: `${caption.title}: ${caption.body}`, ...caption }]
        : [];
    });
}

/** Screenshots, if any exist yet. A glob, not named imports: a named import of a file that
 * has not been captured fails the build rather than leaving the section to fill in later. */
export const screenshots: readonly Screenshot[] = buildScreenshots(
  import.meta.glob<{ default: ImageMetadata }>("../assets/apps/nx-link/*.png", { eager: true }),
);

/** The recording App Review is pointed at, once it exists. From `public/`, so it is a path
 * check rather than an import: a video has no business in the image pipeline. */
export const demoVideo = "/apps/nx-link/demo.mp4";

/** Whether that recording has been made yet. */
export const hasDemoVideo = existsSync(
  new URL("../../public/apps/nx-link/demo.mp4", import.meta.url),
);
