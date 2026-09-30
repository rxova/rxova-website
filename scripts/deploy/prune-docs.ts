#!/usr/bin/env node
// Deletes a project's docs assets older than the one this ingest just uploaded.
// Usage: node prune-docs.ts <tag> <legacyAsset> <keptAsset>. Run only after the upload succeeded.

import { execFileSync } from "node:child_process";

import { errorMessage } from "@rxova/ts-utils";
import { listAssets, staleAssets, type Run } from "../lib/docs-assets.ts";

/** Side effects the prune performs; the defaults are the real ones. */
export interface PruneDocsOptions {
  run?: Run;
  log?: (message: string) => void;
}

/* v8 ignore next -- the real gh; tests pass a fake release */
const execText: Run = (file, args) => execFileSync(file, args, { encoding: "utf8" });

/** Removes every docs asset of `legacyAsset`'s project older than `keep`; returns their names. */
export function pruneDocs(
  tag: string,
  legacyAsset: string,
  keep: string,
  { run = execText, log = console.log }: PruneDocsOptions = {},
): string[] {
  const names = listAssets(tag, run);
  if (!names.includes(keep)) throw new Error(`${tag} does not hold ${keep}; refusing to prune`);
  const stale = staleAssets(legacyAsset, names, keep);
  for (const name of stale) {
    run("gh", ["release", "delete-asset", tag, name, "--yes"]);
    log(`  - ${tag} / ${name}`);
  }
  log(`Kept ${tag} / ${keep}; pruned ${String(stale.length)} older asset(s).`);
  return stale;
}

/** The CLI: runs `pruneDocs` and returns its exit code, printing any failure. */
export function runPruneDocs(
  argv: string[],
  options: PruneDocsOptions = {},
  error: (message: string) => void = console.error,
): number {
  const [tag, legacyAsset, keep] = argv;
  if (!tag || !legacyAsset || !keep) {
    error("usage: prune-docs.ts <tag> <legacyAsset> <keptAsset>");
    return 2;
  }
  try {
    pruneDocs(tag, legacyAsset, keep, options);
    return 0;
  } catch (err) {
    error(`ERROR: ${errorMessage(err)}`);
    return 1;
  }
}

/* v8 ignore start -- entry point; the ingest workflow is what runs it */
if (import.meta.main) process.exitCode = runPruneDocs(process.argv.slice(2));
/* v8 ignore stop */
