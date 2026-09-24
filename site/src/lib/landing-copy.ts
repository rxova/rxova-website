/**
 * The shape of a package's `landing` copy in sources.json, checked by both the
 * landing build (../lib/projects.ts) and `pnpm test` (scripts/registry.test.mjs),
 * so a bad entry fails in the fast suite before it ever reaches a build.
 *
 * @rxova/website-schemas validates only `blurb` and `tags`, and its `landing`
 * object is not strict — so scripts/registry.mjs drops anything else without a
 * word, and a typo such as `feature` or `snipet` would build a page silently
 * missing that section. These rules hold until the schema learns the keys itself.
 *
 * Plain TypeScript with no imports, so vitest can load it without Astro.
 */

/** Every key a package's `landing` may carry. */
export const LANDING_KEYS: readonly string[] = ['blurb', 'tags', 'demo', 'snippet', 'features']

/**
 * Bounds on the overview page's "What you get". Fewer than three is not a list
 * worth a heading; more than five stops being scannable, which is its whole job.
 */
export const MIN_FEATURES = 3
export const MAX_FEATURES = 5

/** Problems with one package's raw `landing` object; empty when there are none. */
export function checkLandingCopy(landing: Record<string, unknown> | undefined): string[] {
  const problems: string[] = []

  const unknown = Object.keys(landing ?? {}).filter((k) => !LANDING_KEYS.includes(k))
  if (unknown.length) {
    problems.push(
      `has unknown landing keys: ${unknown.join(', ')} (allowed: ${LANDING_KEYS.join(', ')})`,
    )
  }

  const features = landing?.features
  if (
    !Array.isArray(features) ||
    features.length < MIN_FEATURES ||
    features.length > MAX_FEATURES ||
    features.some((f) => typeof f !== 'string' || !f.trim())
  ) {
    problems.push(`needs ${MIN_FEATURES}–${MAX_FEATURES} non-empty landing.features`)
  }

  return problems
}
