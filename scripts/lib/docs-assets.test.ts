// Pins how a project's docs assets are aged: the ingest run that wrote one, with the legacy
// fixed name oldest, so the deploy always takes the newest and ingest prunes only older ones.

import { describe, it } from "vitest";
import assert from "node:assert/strict";

import { assetRank, listAssets, newestAsset, staleAssets } from "./docs-assets.ts";

const LEGACY = "docs-journey.tgz";

describe("assetRank", () => {
  it("reads the ingest run id and attempt out of a per-run name", () => {
    assert.deepEqual(assetRank(LEGACY, "docs-journey-18234567890-2.tgz"), [18234567890, 2]);
  });

  it("ranks the legacy fixed name below any per-run name", () => {
    assert.deepEqual(assetRank(LEGACY, LEGACY), [0, 0]);
  });

  it("does not claim another project's docs or anything else on the release", () => {
    // A project whose id extends this one's must not be read as a run of it.
    assert.equal(assetRank(LEGACY, "docs-journey-react-12-1.tgz"), null);
    assert.equal(assetRank(LEGACY, "docs-journey-12.tgz"), null);
    assert.equal(assetRank(LEGACY, "docs-journey-12-1.tar"), null);
    assert.equal(assetRank(LEGACY, "notes.txt"), null);
  });
});

describe("newestAsset", () => {
  it("takes the highest run id, whatever order the release lists them in", () => {
    const names = ["docs-journey-300-1.tgz", "docs-journey-1000-1.tgz", "docs-journey-999-1.tgz"];
    assert.equal(newestAsset(LEGACY, names), "docs-journey-1000-1.tgz");
  });

  it("takes the later attempt of a re-run", () => {
    assert.equal(
      newestAsset(LEGACY, ["docs-journey-7-2.tgz", "docs-journey-7-1.tgz"]),
      "docs-journey-7-2.tgz",
    );
  });

  it("prefers any per-run asset over the legacy one, while both exist", () => {
    assert.equal(newestAsset(LEGACY, [LEGACY, "docs-journey-5-1.tgz"]), "docs-journey-5-1.tgz");
  });

  it("still serves a project that has not re-ingested since the rename", () => {
    assert.equal(newestAsset(LEGACY, [LEGACY]), LEGACY);
  });

  it("returns null for a release holding no docs of this project", () => {
    assert.equal(newestAsset(LEGACY, []), null);
    assert.equal(newestAsset(LEGACY, ["notes.txt"]), null);
  });
});

describe("staleAssets", () => {
  it("names every older docs asset, the legacy one included", () => {
    const names = [LEGACY, "docs-journey-5-1.tgz", "docs-journey-9-1.tgz", "notes.txt"];
    assert.deepEqual(staleAssets(LEGACY, names, "docs-journey-9-1.tgz"), [
      LEGACY,
      "docs-journey-5-1.tgz",
    ]);
  });

  it("leaves a newer asset alone: pruning never deletes what a later ingest wrote", () => {
    const names = ["docs-journey-9-1.tgz", "docs-journey-12-1.tgz"];
    assert.deepEqual(staleAssets(LEGACY, names, "docs-journey-9-1.tgz"), []);
  });

  it("refuses a kept name it cannot age, rather than guessing what is older", () => {
    assert.throws(
      () => staleAssets(LEGACY, [LEGACY], "docs-journey-latest.tgz"),
      /not a docs asset/,
    );
  });
});

describe("listAssets", () => {
  it("asks gh for the release's asset names, one per line", () => {
    const calls: string[][] = [];
    const run = (file: string, args: string[]) => {
      calls.push([file, ...args]);
      return "docs-journey-5-1.tgz\n\n docs-journey.tgz \n";
    };

    assert.deepEqual(listAssets("content-journey", run), [
      "docs-journey-5-1.tgz",
      "docs-journey.tgz",
    ]);
    assert.deepEqual(calls, [
      ["gh", "release", "view", "content-journey", "--json", "assets", "--jq", ".assets[].name"],
    ]);
  });
});
