// Pins the download plan: only enabled projects are fetched, each from its ingest
// release into artifacts/<artifact>, where assemble.ts reads it.

import { afterEach, describe, it } from "vitest";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { fetchDocs, fetchPlan, runFetchDocs, type FetchSource } from "./fetch-docs.ts";
import { loadRegistry } from "../lib/registry.ts";

const registry: { sources: FetchSource[] } = {
  sources: [
    {
      id: "journey",
      enabled: true,
      artifact: "docs-journey",
      releaseTag: "content-journey",
      releaseAsset: "docs-journey.tgz",
    },
    {
      id: "off",
      enabled: false,
      artifact: "docs-off",
      releaseTag: "content-off",
      releaseAsset: "docs-off.tgz",
    },
  ],
};

describe("fetchPlan", () => {
  it("plans a download for every enabled project and skips disabled ones", () => {
    assert.deepEqual(fetchPlan(registry), [
      {
        id: "journey",
        tag: "content-journey",
        asset: "docs-journey.tgz",
        dest: "docs-journey",
      },
    ]);
  });

  it("extracts into artifacts/<artifact>, exactly where assemble.ts reads it", () => {
    const [plan] = fetchPlan(registry);
    assert.equal(plan?.dest, registry.sources[0]?.artifact);
  });

  it("returns nothing for a landing-only registry", () => {
    assert.deepEqual(fetchPlan({ sources: [] }), []);
  });

  it("agrees with the real sources.json (tag/asset/dest all derive from id)", () => {
    for (const plan of fetchPlan(loadRegistry())) {
      assert.equal(plan.tag, `content-${plan.id}`);
      assert.equal(plan.asset, `docs-${plan.id}.tgz`);
      assert.equal(plan.dest, `docs-${plan.id}`);
    }
  });
});

// gh and tar are replaced by a fake release; the directories are real temp dirs.
const roots: string[] = [];
afterEach(() => {
  for (const dir of roots.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const notFound = () =>
  Object.assign(new Error("exit 1"), { stderr: Buffer.from("HTTP 404: Not Found\n") });

/**
 * A fake gh over each release's assets. `afterList` runs once, after the first listing:
 * the moment a concurrent ingest can add a newer asset and prune the listed one.
 */
const fakeGh = (
  releases: Record<string, string[]>,
  afterList?: (assets: Record<string, string[]>) => void,
) => {
  const calls: string[][] = [];
  let listed = false;
  const exec = (file: string, args: string[]) => {
    calls.push([file, ...args]);
    if (file !== "gh") return "";
    const tag = args[2] ?? "";
    const assets = releases[tag];
    if (args[1] === "view") {
      if (assets === undefined)
        throw Object.assign(new Error("exit 1"), { stderr: Buffer.from("release not found") });
      const listing = assets.join("\n");
      if (!listed && afterList) {
        listed = true;
        afterList(releases);
      }
      return listing;
    }
    roots.push(args[args.indexOf("--dir") + 1] ?? "");
    if (!assets?.includes(args[4] ?? "")) throw notFound();
    return "";
  };
  return { calls, exec };
};

const tempDir = () => {
  const dir = mkdtempSync(join(tmpdir(), "rxova-fetch-docs-"));
  roots.push(dir);
  return dir;
};

const quiet = () => {};
const downloads = (calls: string[][]) =>
  calls.filter(([file, , verb]) => file === "gh" && verb === "download").map((call) => call[5]);

describe("fetchDocs", () => {
  it("downloads and extracts the newest docs of each enabled project", () => {
    const artifacts = join(tempDir(), "artifacts");
    const { calls, exec } = fakeGh({
      "content-journey": ["docs-journey.tgz", "docs-journey-20-1.tgz", "docs-journey-9-1.tgz"],
    });
    const log: string[] = [];

    fetchDocs([artifacts], { registry: () => registry, exec, log: (m) => log.push(m) });

    const tmp = roots.at(-1) ?? "";
    const dest = join(artifacts, "docs-journey");
    assert.deepEqual(calls, [
      ["gh", "release", "view", "content-journey", "--json", "assets", "--jq", ".assets[].name"],
      [
        "gh",
        "release",
        "download",
        "content-journey",
        "--pattern",
        "docs-journey-20-1.tgz",
        "--dir",
        tmp,
      ],
      ["tar", "-xzf", join(tmp, "docs-journey-20-1.tgz"), "-C", dest],
    ]);
    assert.ok(existsSync(dest));
    assert.deepEqual(log, [
      `Fetching persisted docs -> ${artifacts}`,
      `  ✓ journey: content-journey / docs-journey-20-1.tgz -> ${dest}`,
      "Done.",
    ]);
  });

  it("still fetches a project that has only the legacy docs-<id>.tgz", () => {
    const { calls, exec } = fakeGh({ "content-journey": ["docs-journey.tgz"] });

    fetchDocs([tempDir()], { registry: () => registry, exec, log: quiet });

    assert.deepEqual(downloads(calls), ["docs-journey.tgz"]);
  });

  it("takes the replacement when a concurrent ingest prunes the listed asset", () => {
    const { calls, exec } = fakeGh({ "content-journey": ["docs-journey-9-1.tgz"] }, (releases) => {
      releases["content-journey"] = ["docs-journey-12-1.tgz"];
    });

    fetchDocs([tempDir()], { registry: () => registry, exec, log: quiet });

    assert.deepEqual(downloads(calls), ["docs-journey-9-1.tgz", "docs-journey-12-1.tgz"]);
    assert.equal(calls.filter(([, , verb]) => verb === "view").length, 2);
  });

  it("re-lists once only: a download that fails with no newer asset is a real failure", () => {
    const failure = notFound();
    const exec = (file: string, args: string[]) => {
      if (args[1] === "view") return "docs-journey-9-1.tgz";
      if (file === "gh") {
        roots.push(args[args.indexOf("--dir") + 1] ?? "");
        throw failure;
      }
      return "";
    };

    assert.throws(
      () => fetchDocs([tempDir()], { registry: () => registry, exec, log: quiet }),
      (err: Error) => {
        assert.equal(
          err.message,
          'no persisted docs for "journey" (release content-journey).\n' +
            "Either it was never ingested, or it should be disabled in sources.json.\n" +
            "HTTP 404: Not Found",
        );
        assert.equal(err.cause, failure);
        return true;
      },
    );
  });

  it("fails naming the project when the replacement vanishes as well", () => {
    let listing = 0;
    const exec = (file: string, args: string[]) => {
      if (args[1] === "view") return `docs-journey-${String((listing += 1))}-1.tgz`;
      if (file === "gh") {
        roots.push(args[args.indexOf("--dir") + 1] ?? "");
        throw notFound();
      }
      return "";
    };

    assert.throws(
      () => fetchDocs([tempDir()], { registry: () => registry, exec, log: quiet }),
      /no persisted docs for "journey"/,
    );
    assert.equal(listing, 2);
  });

  it("names the missing release when the project was never ingested", () => {
    const { exec } = fakeGh({});

    assert.throws(
      () => fetchDocs([tempDir()], { registry: () => registry, exec, log: quiet }),
      /no persisted docs for "journey" \(release content-journey\)\.\n.*\nrelease not found$/,
    );
  });

  it("fails when the release holds no docs of the project", () => {
    const { calls, exec } = fakeGh({ "content-journey": ["notes.txt"] });

    assert.throws(
      () => fetchDocs([tempDir()], { registry: () => registry, exec, log: quiet }),
      /sources\.json\.\nthe release holds no docs asset$/,
    );
    assert.deepEqual(downloads(calls), []);
  });

  it("fetches nothing for a landing-only registry", () => {
    const { calls, exec } = fakeGh({});
    const log: string[] = [];

    fetchDocs([], { registry: () => ({ sources: [] }), exec, log: (m) => log.push(m) });

    assert.deepEqual(calls, []);
    assert.deepEqual(log, ["No enabled projects; landing-only deploy, nothing to fetch."]);
  });

  it("reads the real sources.json by default", () => {
    const releases = Object.fromEntries(
      fetchPlan(loadRegistry()).map((plan) => [plan.tag, [plan.asset]]),
    );
    const { calls, exec } = fakeGh(releases);

    fetchDocs([tempDir()], { exec, log: quiet });

    assert.deepEqual(
      calls.filter(([file, , verb]) => file === "gh" && verb === "view").map((call) => call[3]),
      fetchPlan(loadRegistry()).map((plan) => plan.tag),
    );
  });
});

describe("runFetchDocs", () => {
  it("returns 0 when every fetch succeeds", () => {
    assert.equal(runFetchDocs([], { registry: () => ({ sources: [] }), log: quiet }), 0);
  });

  it("prints the failure and returns 1", () => {
    const errors: string[] = [];
    const registry = () => {
      throw new Error("sources.json: could not be read or parsed");
    };

    assert.equal(
      runFetchDocs([], { registry }, (m) => errors.push(m)),
      1,
    );
    assert.deepEqual(errors, ["ERROR: sources.json: could not be read or parsed"]);
  });
});
