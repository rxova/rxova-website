import { z } from 'zod'

export const PAGE_BUNDLE_FILENAME = 'rxova-page-bundle.json'

export const pageBundleManifest = z
  .object({
    schema: z.literal(2),
    format: z.literal('html-page-component'),
    project: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'project must be a safe source id'),
    base: z.string().regex(/^\/(?:[a-z0-9][a-z0-9-]*\/)+$/, 'base must be a mount path'),
  })
  .strict()
