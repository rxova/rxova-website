/** /apps/nx-link's screenshot join. The page ships before any capture exists, so the empty
 * case is the one that goes live first. */

import { describe, expect, it } from "vitest";

import type { ImageMetadata } from "astro";

import {
  APP_STORE_URL,
  SHOT_COPY,
  SUPPORT_EMAIL,
  buildScreenshots,
  demoVideo,
  screenshots,
} from "./nx-link";

const image = (src: string): { default: ImageMetadata } => ({
  default: { src, width: 1320, height: 2868, format: "png" },
});

const modules = (...names: string[]): Record<string, { default: ImageMetadata }> =>
  Object.fromEntries(names.map((name) => [`../assets/apps/nx-link/${name}`, image(`/${name}`)]));

describe("buildScreenshots", () => {
  it("returns nothing when no screenshot has been captured", () => {
    expect(buildScreenshots({})).toEqual([]);
  });

  it("pairs each file with the caption written for it", () => {
    const [shot] = buildScreenshots(modules("02-gallery.png"));

    expect(shot?.title).toBe("The card");
    expect(shot?.src.src).toBe("/02-gallery.png");
  });

  it("orders by file name, not by caption", () => {
    const built = buildScreenshots(modules("04-transfer.png", "01-connect.png", "02-gallery.png"));

    expect(built.map((shot) => shot.title)).toEqual(["Connect", "The card", "Transfer"]);
  });

  it("describes each shot for a reader who cannot see it", () => {
    const [shot] = buildScreenshots(modules("01-connect.png"));

    expect(shot?.alt).toBe(`Connect: ${SHOT_COPY["01-connect"]?.body}`);
  });

  // The capture script can be pointed at a new screen before anyone writes a
  // line about it; a bare frame on the page would be worse than none.
  it("drops a capture that has no caption", () => {
    expect(buildScreenshots(modules("09-viewfinder.png"))).toEqual([]);
  });
});

describe("the page's own facts", () => {
  // Until Apple approves the listing the hero has to offer something else, and
  // the page decides that from this being null.
  it("has no App Store link while the listing is in review", () => {
    expect(APP_STORE_URL).toBeNull();
  });

  it("points support at a reachable place", () => {
    expect(SUPPORT_EMAIL).toContain("@");
    expect(demoVideo.startsWith("/")).toBe(true);
  });

  it("builds the real glob without throwing", () => {
    expect(Array.isArray(screenshots)).toBe(true);
  });
});
