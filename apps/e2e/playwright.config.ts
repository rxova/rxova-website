import { resolve } from "node:path";

import { devices } from "@playwright/test";
import { basePlaywrightConfig } from "@rxova/repo-config/playwright";

// The assembled site, built the way the deploy does it, which takes minutes on a cold cache.
export default basePlaywrightConfig({
  command: "pnpm --workspace-root run serve:site",
  port: 4480,
  fullyParallel: true,
  workers: "50%",
  webServerTimeout: 600_000,
  testIgnore: /visual\.spec/,
  // Screenshots are compared locally only (`pnpm visual`); font rendering differs across machines.
  snapshotPathTemplate: `${resolve(import.meta.dirname, "../..")}/.lock/visual/{arg}{ext}`,
  projects: [{ name: "visual", use: { ...devices["Desktop Chrome"] }, testMatch: /visual\.spec/ }],
});
