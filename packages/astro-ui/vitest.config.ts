import { getViteConfig } from "astro/config";
import { baseVitestConfig } from "@rxova/repo-config/vitest";

// Tests live in test/, which the tarball's `files` leaves out. getViteConfig compiles `.astro` for the container API.
export default getViteConfig(
  baseVitestConfig({
    root: import.meta.dirname,
    include: ["test/**/*.test.ts"],
    coverageInclude: ["src/**/*.ts"],
    reporter: ["text", "json-summary"],
  }),
);
