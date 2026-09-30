// Pins the prune ingest.yml runs after uploading: only this project's older docs assets go,
// and nothing is deleted unless the new one is already on the release.

import { describe, it } from "vitest";
import assert from "node:assert/strict";

import { pruneDocs, runPruneDocs } from "./prune-docs.ts";

const TAG = "content-journey";
const LEGACY = "docs-journey.tgz";

/** A fake gh over one release: `release view` lists `assets`, `delete-asset` removes one. */
const fakeGh = (assets: string[]) => {
  const deleted: string[] = [];
  const run = (file: string, args: string[]) => {
    assert.equal(file, "gh");
    if (args[1] === "view") return assets.join("\n");
    if (args[1] === "delete-asset") {
      const name = args[3] ?? "";
      deleted.push(name);
      assets.splice(assets.indexOf(name), 1);
      return "";
    }
    throw new Error(`unexpected gh ${args.join(" ")}`);
  };
  return { deleted, run, assets };
};

const quiet = () => {};

describe("pruneDocs", () => {
  it("deletes the project's older assets, the legacy one included, and keeps the new one", () => {
    const gh = fakeGh([LEGACY, "docs-journey-5-1.tgz", "docs-journey-9-1.tgz", "notes.txt"]);
    const log: string[] = [];

    const pruned = pruneDocs(TAG, LEGACY, "docs-journey-9-1.tgz", {
      run: gh.run,
      log: (m) => log.push(m),
    });

    assert.deepEqual(pruned, [LEGACY, "docs-journey-5-1.tgz"]);
    assert.deepEqual(gh.assets, ["docs-journey-9-1.tgz", "notes.txt"]);
    assert.deepEqual(log, [
      `  - ${TAG} / ${LEGACY}`,
      `  - ${TAG} / docs-journey-5-1.tgz`,
      `Kept ${TAG} / docs-journey-9-1.tgz; pruned 2 older asset(s).`,
    ]);
  });

  it("deletes nothing when the kept asset is not on the release", () => {
    // Guards against an upload that failed silently: the old docs are all a deploy has.
    const gh = fakeGh([LEGACY]);

    assert.throws(
      () => pruneDocs(TAG, LEGACY, "docs-journey-9-1.tgz", { run: gh.run, log: quiet }),
      /does not hold docs-journey-9-1\.tgz; refusing to prune/,
    );
    assert.deepEqual(gh.deleted, []);
  });

  it("leaves a newer asset another ingest wrote in the meantime", () => {
    const gh = fakeGh(["docs-journey-9-1.tgz", "docs-journey-12-1.tgz"]);

    assert.deepEqual(
      pruneDocs(TAG, LEGACY, "docs-journey-9-1.tgz", { run: gh.run, log: quiet }),
      [],
    );
    assert.deepEqual(gh.deleted, []);
  });
});

describe("runPruneDocs", () => {
  it("returns 0 when the prune succeeds", () => {
    const gh = fakeGh(["docs-journey-9-1.tgz"]);
    assert.equal(
      runPruneDocs([TAG, LEGACY, "docs-journey-9-1.tgz"], { run: gh.run, log: quiet }),
      0,
    );
  });

  it("prints the failure and returns 1", () => {
    const errors: string[] = [];
    const gh = fakeGh([]);

    assert.equal(
      runPruneDocs([TAG, LEGACY, "docs-journey-9-1.tgz"], { run: gh.run, log: quiet }, (m) =>
        errors.push(m),
      ),
      1,
    );
    assert.deepEqual(errors, [
      "ERROR: content-journey does not hold docs-journey-9-1.tgz; refusing to prune",
    ]);
  });

  it("prints the usage and returns 2 when an argument is missing", () => {
    const errors: string[] = [];

    assert.equal(
      runPruneDocs([TAG, LEGACY], {}, (m) => errors.push(m)),
      2,
    );
    assert.deepEqual(errors, ["usage: prune-docs.ts <tag> <legacyAsset> <keptAsset>"]);
  });
});
