/** What a repo sends rxova-website when it has a build ready; every field is untrusted input. */

import { z } from 'zod'

import { sourceId } from './registry.ts'

/**
 * The build-ready dispatch; it crosses a trust boundary, so every field is constrained.
 * `version` is optional because a docs push has none; the semver'd site surfaces send one.
 */
export const dispatchPayload = z
  .object({
    /** Contract version. The receiver rejects anything it does not speak. */
    schema: z.union([z.literal(1), z.literal(2)]).default(1),
    project: sourceId,
    /** No leading `-` (would parse as a `git`/`gh` flag) and no `..` (path traversal). */
    ref: z.string().regex(/^(?!-)(?!.*\.\.)[A-Za-z0-9._/-]+$/, 'not a branch name or tag'),
    sha: z.string().regex(/^[0-9a-fA-F]{7,40}$/, 'not a commit sha'),
    /** The run holding the uploaded dist. Digits — it indexes an API path. */
    run_id: z.union([z.string().regex(/^\d+$/), z.number().int().positive()]),
    /** Optional; sent by the semver'd site surfaces. */
    version: z
      .string()
      // The prerelease/build tail uses semver's own character set, so no shell metacharacters.
      .regex(/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/, 'not semver')
      .optional(),
    /** Optional cross-check of the base the receiver derives from `project`; a real path only. */
    base: z
      .string()
      .regex(/^\/(?:[a-z0-9][a-z0-9-]*\/)+$/, 'not a mount path')
      .optional(),
    framework: z.string().min(1).optional(),
  })
  .strict()

export type DispatchPayload = z.infer<typeof dispatchPayload>
