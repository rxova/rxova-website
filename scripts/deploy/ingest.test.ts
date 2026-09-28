// Pins ingest's two trust gates: 2a validates the dispatch metadata (project, base, ref, run id),
// 2b validates the dist itself (missing, empty, or no index.html).

import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  type DispatchSource,
  validateDispatch,
  checkDist,
  IngestError,
  SUPPORTED_SCHEMA,
  DIST_ARTIFACT_NAME,
} from "./ingest.ts";

/** A registry stub with just the fields validateDispatch reads. */
const registry: { sources: DispatchSource[] } = {
  sources: [
    {
      id: "journey",
      kind: "package",
      enabled: true,
      repo: "rxova/journey",
      base: "/packages/journey/",
      mount: "packages/journey",
      releaseTag: "content-journey",
      releaseAsset: "docs-journey.tgz",
    },
    {
      id: "blog",
      kind: "site",
      enabled: true,
      repo: "rxova/brand",
      base: "/blog/",
      mount: "blog",
      releaseTag: "content-blog",
      releaseAsset: "docs-blog.tgz",
    },
    {
      id: "storybook-react-inputs",
      kind: "storybook",
      enabled: true,
      repo: "rxova/react-inputs",
      base: "/storybook/react-inputs/",
      mount: "storybook/react-inputs",
      releaseTag: "content-storybook-react-inputs",
      releaseAsset: "docs-storybook-react-inputs.tgz",
    },
    {
      id: "off",
      kind: "package",
      enabled: false,
      repo: "rxova/off",
      base: "/packages/off/",
      mount: "packages/off",
      releaseTag: "content-off",
      releaseAsset: "docs-off.tgz",
    },
  ],
};

/** A minimal valid dispatch; individual tests override the field under test. */
const payload = (over = {}) => ({
  schema: SUPPORTED_SCHEMA,
  project: "journey",
  ref: "main",
  sha: "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678",
  run_id: "1234567890",
  ...over,
});

describe("validateDispatch — the happy path", () => {
  it("accepts a well-formed dispatch and derives fetch + persist targets", () => {
    const { source, meta } = validateDispatch(registry, payload({ base: "/packages/journey/" }));
    assert.equal(source.id, "journey");
    assert.equal(meta.project, "journey");
    assert.equal(meta.runId, "1234567890");
    assert.equal(source.repo, "rxova/journey");
    assert.equal(source.releaseTag, "content-journey");
    assert.equal(source.releaseAsset, "docs-journey.tgz");
    // The workflow gates its deploy on this.
    assert.equal(meta.enabled, true);
    assert.equal(meta.schema, 1);
  });

  it("coerces a numeric run id and treats base as optional", () => {
    const { meta } = validateDispatch(registry, payload({ run_id: 42, base: undefined }));
    assert.equal(meta.runId, "42");
    assert.equal(meta.framework, "other"); // defaulted when the sender omits it
  });

  // The mount confinement check hardcoded `packages/<id>`, which predates
  // `kind: "site"` — it refused every /blog and /updates ingest outright.
  it("accepts a site surface, which mounts at the root rather than under packages/", () => {
    const { source } = validateDispatch(registry, payload({ project: "blog", base: "/blog/" }));
    assert.equal(source.mount, "blog");
    assert.equal(source.releaseTag, "content-blog");
  });

  it("accepts a storybook surface, which nests under the shared /storybook/ tree", () => {
    const { source, meta } = validateDispatch(
      registry,
      payload({
        project: "storybook-react-inputs",
        base: "/storybook/react-inputs/",
        schema: 1,
        framework: "storybook",
      }),
    );
    assert.equal(source.mount, "storybook/react-inputs");
    assert.equal(source.releaseTag, "content-storybook-react-inputs");
    // The workshop senders declare their toolchain honestly rather than 'other'.
    assert.equal(meta.framework, "storybook");
  });

  it("keeps the artifact name a single shared convention", () => {
    assert.equal(DIST_ARTIFACT_NAME, "docs-dist");
  });
});

describe("validateDispatch — rejections", () => {
  const rejects = (over: Record<string, unknown>, re: RegExp) =>
    assert.throws(
      () => validateDispatch(registry, payload(over)),
      (e) => e instanceof IngestError && re.test(e.message),
    );

  it("rejects a payload that is not an object", () => {
    assert.throws(() => validateDispatch(registry, null), /client_payload is invalid/);
    assert.throws(() => validateDispatch(registry, []), /client_payload is invalid/);
  });

  it("rejects an unsupported schema, so a sender on a newer contract fails loudly", () => {
    rejects({ schema: 3 }, /schema 3 is not supported/);
  });

  it("rejects schema 2, the retired body-only page bundle", () => {
    rejects({ schema: 2 }, /schema 2 is not supported — send schema 1/);
  });

  it("rejects an unknown project rather than ingesting docs nothing links to", () => {
    rejects({ project: "nope" }, /unknown project "nope"/);
    rejects({ project: "" }, /project —/);
  });

  it("accepts a disabled project — the docs are persisted, just not deployed", () => {
    // Persisting a disabled project's docs means the release already exists when
    // it is enabled, so fetch-docs does not fail.
    const { source, meta } = validateDispatch(registry, payload({ project: "off" }));
    assert.equal(source.id, "off");
    assert.equal(meta.enabled, false);
  });

  it("rejects a base that disagrees with the mount — the classic 404-everything bug", () => {
    rejects({ base: "/packages/journeys/" }, /built for base/);
    // `/` is refused earlier by the shared contract: no source mounts at the root.
    rejects({ base: "/" }, /base —/);
    rejects({ base: "/../../var/www/" }, /base —/);
  });

  it("rejects a sha, ref or run id that is not what it claims to be", () => {
    // Shapes belong to the shared contract, so assert on the field, not its wording;
    // run_id indexes an API path, and ref and sha reach release notes.
    rejects({ sha: "not-a-sha" }, /sha —/);
    rejects({ sha: undefined }, /sha —/);
    rejects({ ref: "main; rm -rf /" }, /ref —/);
    rejects({ ref: "$(whoami)" }, /ref —/);
    rejects({ ref: "../../main" }, /ref —/);
    rejects({ ref: "--upload-pack=curl" }, /ref —/);
    rejects({ run_id: "abc" }, /run_id —/);
    rejects({ run_id: undefined }, /run_id —/);
    rejects({ run_id: "1; rm -rf /" }, /run_id —/);
  });

  it("rejects an unknown framework", () => {
    rejects({ framework: "vitepress" }, /unknown framework/);
  });

  it("says the registry knows nothing when it is empty", () => {
    assert.throws(
      () => validateDispatch({ sources: [] }, payload()),
      /unknown project "journey" — sources\.json knows: \(none\)$/,
    );
  });

  it("refuses a mount the shared derivation disagrees with, or that leaves the tree", () => {
    const journey = registry.sources[0]!;
    for (const mount of ["docs/journey", "/packages/journey", "packages/../journey"]) {
      assert.throws(
        () => validateDispatch({ sources: [{ ...journey, mount }] }, payload()),
        (e) =>
          e instanceof IngestError &&
          e.message === `refusing mount ${JSON.stringify(mount)} for "journey" (kind package)`,
      );
    }
  });
});

describe("checkDist — gate 2b", () => {
  let dir: string;
  const make = () => mkdtempSync(join(tmpdir(), "rxova-dist-"));

  it("accepts a directory with an index.html at its root", () => {
    dir = make();
    writeFileSync(join(dir, "index.html"), "<!doctype html>");
    mkdirSync(join(dir, "assets"));
    writeFileSync(join(dir, "assets", "app.css"), "body{}");
    assert.deepEqual(checkDist(dir), { entries: 2 });
    rmSync(dir, { recursive: true, force: true });
  });

  it("rejects a missing directory", () => {
    assert.throws(
      () => checkDist(join(tmpdir(), "does-not-exist-xyz")),
      /missing or not a directory/,
    );
  });

  it("rejects an empty directory", () => {
    dir = make();
    assert.throws(() => checkDist(dir), /is empty/);
    rmSync(dir, { recursive: true, force: true });
  });

  it("rejects a build with no index.html at the root — the wrong base or wrong dir", () => {
    dir = make();
    writeFileSync(join(dir, "sitemap.xml"), "<urlset/>");
    assert.throws(() => checkDist(dir), /no index\.html/);
    rmSync(dir, { recursive: true, force: true });
  });

  it("rejects a path that is a file rather than a directory", () => {
    dir = make();
    writeFileSync(join(dir, "index.html"), "<!doctype html>");
    assert.throws(() => checkDist(join(dir, "index.html")), /missing or not a directory/);
    rmSync(dir, { recursive: true, force: true });
  });
});
