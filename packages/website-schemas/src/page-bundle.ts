/**
 * The static-document contract consumed by rxova-website.
 *
 * Schema 1 artifacts are complete sites and are copied as-is. Schema 2 artifacts
 * are still ordinary, independently-built HTML trees, but their document bodies
 * contain only the surface's page UI. The aggregator supplies the rxova.org
 * header, footer, global head elements and analytics at deploy time.
 */

import { z } from 'zod'

import { sourceId } from './registry.ts'

export const PAGE_BUNDLE_FILENAME = 'rxova-page-bundle.json'

export const pageBundleManifest = z
  .object({
    schema: z.literal(2),
    format: z.literal('html-page-component'),
    project: sourceId,
    base: z.string().regex(/^\/(?:[a-z0-9][a-z0-9-]*\/)+$/, 'not a mount path'),
  })
  .strict()

export type PageBundleManifest = z.infer<typeof pageBundleManifest>

export function createPageBundleManifest(project: string, base: string): PageBundleManifest {
  return pageBundleManifest.parse({
    schema: 2,
    format: 'html-page-component',
    project,
    base,
  })
}
