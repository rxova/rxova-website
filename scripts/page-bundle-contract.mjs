import { z } from 'zod'

export const PAGE_BUNDLE_FILENAME = 'rxova-page-bundle.json'

/**
 * The meta name a document uses to say it is a standalone asset, not a page.
 *
 * A page bundle is a tree of *page components*: bodies the aggregator splices
 * into the rxova.org shell. But a docs site can legitimately ship HTML that is
 * not a page — an iframe target, a demo shell, anything served as an asset. The
 * use-everywhere playground is the case that surfaced this: it is a frame holder
 * plus a per-tab document, and both must stay on the origin (the whole point is
 * that the frames share a `BroadcastChannel`), so they ride along in the dist.
 *
 * Nothing distinguished them. `<main>` was required of every `.html` in the
 * tree, so the playground failed gate 2b — and had it passed, `composeInto`
 * would have wrapped each simulated tab in the site header and footer inside a
 * 300px frame. Adding a `<main>` would have turned a loud rejection into a
 * quiet visual bug.
 *
 * So the document declares what it is. Marked documents are copied verbatim and
 * skipped by both the gate and the composer; an unmarked one is a page
 * component exactly as before, which keeps the default safe — forgetting the
 * marker fails loudly rather than publishing an uncomposed page.
 *
 * Named for the same reason `rxova-head-slot` is: it is shell vocabulary, and a
 * `<meta name>` survives every HTML pipeline that might otherwise strip an
 * unknown attribute.
 */
export const STANDALONE_MARKER = 'rxova-standalone'

/**
 * Whether raw HTML declares itself standalone.
 *
 * Text-level rather than parsed, because both callers want it before deciding
 * whether to parse at all — and the ingest gate has no parser in its path.
 */
export const declaresStandalone = (html) =>
  new RegExp(`<meta[^>]+name=["']${STANDALONE_MARKER}["']`, 'i').test(html)

export const pageBundleManifest = z
  .object({
    schema: z.literal(2),
    format: z.literal('html-page-component'),
    project: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'project must be a safe source id'),
    base: z.string().regex(/^\/(?:[a-z0-9][a-z0-9-]*\/)+$/, 'base must be a mount path'),
  })
  .strict()
