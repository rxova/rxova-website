#!/usr/bin/env node
// Assemble the combined rxova.org site from downloaded build artifacts.
//
// Usage: node scripts/assemble.mjs [artifactsDir=artifacts] [outDir=_site]
//
// Layout of `artifactsDir` (as produced by actions/download-artifact@v4 with no
// name — one folder per artifact):
//   artifacts/landing/        <- Astro `site/dist` (the landing page)
//   artifacts/docs-journey/   <- journey `apps/docs/build`, built with base /packages/journey/
//   artifacts/docs-inputs/    <- inputs docs, built with base /packages/inputs/ (optional)
//
// Mounts are data-driven from sources.json so adding a project is a config change,
// not a code change. Each source's uploaded artifact must already be laid out to
// match its `base` URL (the aggregator only relocates it under `mount`).

import { cp, mkdir, readFile, access, rm } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const [, , artifactsDir = "artifacts", outDir = "_site"] = process.argv;

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function copyInto(src, dest, { label }) {
  if (!(await exists(src))) return false;
  await mkdir(dirname(dest) === dest ? dest : dirname(dest), { recursive: true });
  await mkdir(dest, { recursive: true });
  await cp(src, dest, { recursive: true });
  console.log(`  ✓ ${label}: ${src} -> ${dest}`);
  return true;
}

async function main() {
  const config = JSON.parse(await readFile(join(repoRoot, "sources.json"), "utf8"));

  // Fresh output tree.
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  console.log(`Assembling site -> ${outDir}`);

  // 1. Landing at root (required).
  const landing = config.landing ?? { artifact: "landing", mount: "." };
  const landingSrc = join(artifactsDir, landing.artifact);
  const landingOk = await copyInto(landingSrc, join(outDir, landing.mount), {
    label: "landing",
  });
  if (!landingOk) {
    console.error(`ERROR: landing artifact missing at ${landingSrc}`);
    process.exit(1);
  }

  // 2. Each external docs source under its mount.
  for (const s of config.sources ?? []) {
    const src = join(artifactsDir, s.artifact);
    const dest = join(outDir, s.mount);
    const ok = await copyInto(src, dest, { label: s.name });
    if (!ok) {
      // A missing artifact means that source's build job was gated off or didn't
      // run — that's fine here. Whether the site *should* include it is enforced
      // at the workflow level (job gates + assemble-deploy `needs`), not here.
      console.log(`  – ${s.name}: artifact absent, skipping`);
    }
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
