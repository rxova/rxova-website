// The assembler must refuse to publish when an enabled project's artifact is missing;
// these tests mostly cover that refusal — the happy path is a `cp -r`.

import { describe, it, beforeEach, afterAll } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { assemble, type AssembleOptions } from "./assemble.ts";
import { BEACON_SRC } from "../lib/analytics.ts";
import { resolveSource, type Registry } from "../lib/registry.ts";

const roots: string[] = [];
let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "rxova-assemble-"));
  roots.push(root);
});
afterAll(() => {
  for (const dir of roots) rmSync(dir, { recursive: true, force: true });
});

const registry = (...raw: Record<string, unknown>[]): Registry => ({
  landing: { artifact: "landing", mount: "." },
  // `landing` copy is required of a package by the shared schema, so the fixture
  // carries it; these tests are about mounting, not about the home page.
  sources: raw.map((r) =>
    resolveSource({ enabled: true, landing: { blurb: "b", tags: ["t"] }, ...r }),
  ),
});

/** Write an artifact directory as download-artifact would leave it. */
function artifact(name: string, files: Record<string, string>): void {
  for (const [path, body] of Object.entries(files)) {
    const full = join(root, "artifacts", name, path);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, body);
  }
}

const run = (config: Registry, options?: AssembleOptions) =>
  assemble(config, join(root, "artifacts"), join(root, "_site"), options);
const site = (...parts: string[]) => join(root, "_site", ...parts);
const read = (...parts: string[]) => readFileSync(site(...parts), "utf8");

describe("assemble", () => {
  it("puts the landing at the root and each project under its mount", () => {
    artifact("landing", { "index.html": "landing", "assets/site.css": "css" });
    artifact("docs-journey", { "index.html": "journey docs" });
    artifact("docs-use-everywhere", { "index.html": "ue docs", "guide/index.html": "guide" });

    return run(registry({ id: "journey" }, { id: "use-everywhere" })).then(() => {
      assert.equal(read("index.html"), "landing");
      assert.equal(read("assets/site.css"), "css");
      // The mount must match the base the docs were built with, or every asset 404s.
      assert.equal(read("packages/journey/index.html"), "journey docs");
      assert.equal(read("packages/use-everywhere/guide/index.html"), "guide");
    });
  });

  // The index is built from the finished tree, so it must see a project's own
  // llms.txt from that project's artifact.
  it("writes the agent index once every project is mounted", async () => {
    artifact("landing", { "index.html": "landing" });
    artifact("docs-journey", { "index.html": "journey docs" });
    artifact("docs-react-inputs", { "index.html": "docs", "llms.txt": "# react-inputs\n" });

    await run(registry({ id: "journey" }, { id: "react-inputs" }));

    const index = read("llms.txt");
    assert.match(index, /^# Rxova$/m);
    assert.match(
      index,
      /^- \[react-inputs]\(https:\/\/rxova\.dev\/packages\/react-inputs\/llms\.txt\)/m,
    );
    // No index of its own yet, so the docs root — not a link that would 404.
    assert.match(index, /^- \[journey]\(https:\/\/rxova\.dev\/packages\/journey\/\)/m);
  });

  it("refuses to deploy when an enabled project has no artifact", async () => {
    artifact("landing", { "index.html": "landing" });
    await assert.rejects(
      run(registry({ id: "journey" })),
      /enabled project\(s\) with no artifact[\s\S]*journey/,
    );
  });

  it("names every missing project, not just the first", async () => {
    artifact("landing", { "index.html": "landing" });
    await assert.rejects(run(registry({ id: "a" }, { id: "b" })), (err: Error) => {
      assert.match(err.message, /\ba\b/);
      assert.match(err.message, /\bb\b/);
      return true;
    });
  });

  it("does not require an artifact for a disabled project", async () => {
    artifact("landing", { "index.html": "landing" });
    await run(registry({ id: "later", enabled: false }));
    assert.equal(existsSync(site("packages/later")), false, "and does not mount it");
  });

  it("refuses to deploy without the landing", async () => {
    artifact("docs-journey", { "index.html": "journey" });
    await assert.rejects(run(registry({ id: "journey" })), /landing artifact missing/);
  });

  it("starts from a clean tree, so a removed project does not linger", async () => {
    artifact("landing", { "index.html": "landing" });
    mkdirSync(site("packages/gone"), { recursive: true });
    writeFileSync(site("packages/gone/index.html"), "stale docs from a previous run");

    await run(registry());
    assert.equal(existsSync(site("packages/gone")), false);
  });

  it("deploys landing-only when nothing is enabled", async () => {
    artifact("landing", { "index.html": "landing" });
    await run(registry());
    assert.equal(read("index.html"), "landing");
  });
});

describe("docs artifacts", () => {
  const docsPage = "<html><head><title>Docs</title></head><body><main>Docs</main></body></html>";

  it("adds the analytics beacon to every page when the deploy has a token", async () => {
    artifact("landing", { "index.html": "landing" });
    artifact("docs-journey", {
      "index.html": docsPage,
      "guide/index.html": docsPage,
      "_astro/app.css": "body{}",
      "demo.html":
        '<html><head><meta name="rxova-standalone" content=""></head><body>demo</body></html>',
    });
    await run(registry({ id: "journey" }), { analyticsToken: "t0k" });

    assert.match(read("packages/journey/index.html"), /beacon\.min\.js/);
    assert.match(read("packages/journey/guide/index.html"), /&quot;token&quot;:&quot;t0k&quot;/);
    assert.doesNotMatch(read("packages/journey/demo.html"), /beacon/);
    assert.equal(read("packages/journey/_astro/app.css"), "body{}");
    // The landing is the site's own build, which renders its beacon itself.
    assert.equal(read("index.html"), "landing");
  });

  it("publishes them byte for byte without a token", async () => {
    artifact("landing", { "index.html": "landing" });
    artifact("docs-journey", { "index.html": docsPage });
    await run(registry({ id: "journey" }));

    assert.equal(read("packages/journey/index.html"), docsPage);
    assert.equal(read("packages/journey/index.html").includes(BEACON_SRC), false);
  });
});

describe("the landing", () => {
  it("reads the landing from artifacts/landing when the registry does not say", async () => {
    artifact("landing", { "index.html": "landing" });
    // The type requires `landing`; a file without it still loads, so the default must hold.
    const config = { sources: [] } as unknown as Registry;
    await assemble(config, join(root, "artifacts"), join(root, "_site"));
    assert.equal(read("index.html"), "landing");
  });
});
