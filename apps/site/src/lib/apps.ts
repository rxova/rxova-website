/** What /apps lists: the shipped applications, as distinct from the packages on /projects.
 * Each entry is only the card; the app's own page under /apps/<id>/ is the detail. */

import { APP_STORE_URL } from "./nx-link";

export interface SiteApp {
  id: string;
  label: string;
  /** Where it runs, said the way a store listing says it. */
  platform: string;
  /** One line, for the card's heading row. */
  tagline: string;
  /** The paragraph under it: what it does and who wants it. */
  blurb: string;
  /** This app's page on rxova.dev. */
  href: `/apps/${string}/`;
  /** The store listing, absent until the app has one. */
  store?: { label: string; href: string };
  /** Short facts under the blurb — price, privacy, hardware. */
  facts: readonly string[];
}

/**
 * Apps in display order. Takes the listing URL rather than reading it, so the card's store
 * button and the app's own page download button are the same fact, said once.
 */
export function buildApps(storeUrl: string | null): readonly SiteApp[] {
  return [
    {
      id: "nx-link",
      label: "NX LinkConnect",
      platform: "iPhone",
      tagline: "Photos off a Samsung NX camera, onto an iPhone.",
      blurb:
        "Samsung's own app cannot run on a current iPhone. This one joins the camera's Wi-Fi, lists the card, and copies full-resolution originals straight into your photo library — with a live viewfinder and a remote shutter.",
      href: "/apps/nx-link/",
      ...(storeUrl ? { store: { label: "Get it on the App Store", href: storeUrl } } : {}),
      facts: ["Free", "No account, nothing collected", "NX300 and NX3000 tested"],
    },
  ];
}

export const APPS: readonly SiteApp[] = buildApps(APP_STORE_URL);
