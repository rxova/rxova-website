// Ages of a project's docs assets on content-<id>: ingest.yml writes docs-<id>-<runId>-<attempt>.tgz,
// a new name per run, so a reader never meets a moment with no asset. docs-<id>.tgz is the legacy name.

/** Runs a command and returns its stdout; the real one is execFileSync with utf8. */
export type Run = (file: string, args: string[]) => string;

/** The ingest run that wrote an asset, as [run id, attempt]; the legacy fixed name is [0, 0]. */
export type AssetRank = readonly [runId: number, attempt: number];

const stemOf = (legacyAsset: string): string => legacyAsset.replace(/\.tgz$/, "");

/** How new an asset is, or null for one that is not this project's docs. */
export function assetRank(legacyAsset: string, name: string): AssetRank | null {
  if (name === legacyAsset) return [0, 0];
  const prefix = `${stemOf(legacyAsset)}-`;
  if (!name.startsWith(prefix)) return null;
  const match = /^(\d+)-(\d+)\.tgz$/.exec(name.slice(prefix.length));
  return match ? [Number(match[1]), Number(match[2])] : null;
}

const compare = (a: AssetRank, b: AssetRank): number => a[0] - b[0] || a[1] - b[1];

/** The newest of this project's docs assets, or null when the release holds none. */
export function newestAsset(legacyAsset: string, names: readonly string[]): string | null {
  let best: { name: string; rank: AssetRank } | null = null;
  for (const name of names) {
    const rank = assetRank(legacyAsset, name);
    if (rank !== null && (best === null || compare(rank, best.rank) > 0)) best = { name, rank };
  }
  return best?.name ?? null;
}

/** This project's docs assets older than `keep`; anything newer or unrelated is left alone. */
export function staleAssets(legacyAsset: string, names: readonly string[], keep: string): string[] {
  const kept = assetRank(legacyAsset, keep);
  if (kept === null) throw new Error(`"${keep}" is not a docs asset of ${legacyAsset}`);
  return names.filter((name) => {
    const rank = assetRank(legacyAsset, name);
    return rank !== null && compare(rank, kept) < 0;
  });
}

/** The names of every asset on a release. Throws (gh's error) when the release does not exist. */
export function listAssets(tag: string, run: Run): string[] {
  return run("gh", ["release", "view", tag, "--json", "assets", "--jq", ".assets[].name"])
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
}
