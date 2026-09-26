/**
 * The static-document contract consumed by rxova-website. Schema 1 artifacts are copied as-is;
 * schema 2 bodies hold only page UI, and the aggregator adds the rxova.org chrome at deploy.
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
