import { baseVitestConfig } from "@rxova/repo-config/vitest";

// A published package: 95% coverage per file on all four metrics, so a well-covered module
// cannot carry an untested one to a green aggregate.
export default baseVitestConfig({ root: import.meta.dirname, reporter: ["text", "json-summary"] });
