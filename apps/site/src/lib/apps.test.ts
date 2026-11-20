import { describe, expect, it } from "vitest";

import { APPS, buildApps } from "./apps";
import { APP_STORE_URL } from "./nx-link";

describe("buildApps", () => {
  it("gives an app with a listing a store button pointing at it", () => {
    const [app] = buildApps("https://apps.apple.com/app/x/id1");
    expect(app?.store).toEqual({
      label: "Get it on the App Store",
      href: "https://apps.apple.com/app/x/id1",
    });
  });

  // Before a listing exists the card has to offer the app's page alone; a dead
  // "Get it on the App Store" would be worse than no button.
  it("leaves the store button off an app with no listing yet", () => {
    const [app] = buildApps(null);
    expect(app?.store).toBeUndefined();
  });

  // Every card links to a page under /apps/, with the trailing slash GitHub Pages
  // would otherwise redirect to. See ./internal-links.ts.
  it("links each app's own page as a root-relative path with a trailing slash", () => {
    for (const app of buildApps(null)) {
      expect(app.href.startsWith("/apps/")).toBe(true);
      expect(app.href.endsWith("/")).toBe(true);
    }
  });

  it("gives every app the copy the card renders", () => {
    for (const app of buildApps(null)) {
      expect(app.label).toBeTruthy();
      expect(app.platform).toBeTruthy();
      expect(app.tagline).toBeTruthy();
      expect(app.blurb).toBeTruthy();
      expect(app.facts.length).toBeGreaterThan(0);
    }
  });
});

describe("APPS", () => {
  it("lists NX LinkConnect, carrying the listing the app's own page uses", () => {
    expect(APPS.map((app) => app.id)).toEqual(["nx-link"]);
    expect(APPS[0]?.store?.href).toBe(APP_STORE_URL ?? undefined);
  });
});
