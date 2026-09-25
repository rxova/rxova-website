/**
 * What a repo sends rxova-website when it has a build ready.
 *
 * This crosses a trust boundary — it arrives from another repository, `run_id` is
 * used to fetch an artifact, and `ref` and `sha` reach release notes. So every
 * field is constrained to what it can actually be rather than trusted.
 */

import { z } from 'zod'

import { sourceId } from './registry.ts'

/**
 * What a repo sends rxova-website when it has a build ready to publish.
 *
 * This crosses a trust boundary — it arrives from another repo, and `run_id` is
 * used to fetch an artifact while `ref` and `sha` end up in release notes. So every
 * field is constrained to what it can actually be, rather than trusted.
 *
 * `version` is optional because a docs push has no version of its own; the site
 * surfaces built here are semver'd and send one.
 */
export const dispatchPayload = z
  .object({
    /** Contract version. The receiver rejects anything it does not speak. */
    schema: z.union([z.literal(1), z.literal(2)]).default(1),
    project: sourceId,
    /**
     * A leading `-` becomes an argument if the receiver ever passes this to `git`
     * or `gh` positionally, and `..` traverses if it reaches a path or a URL.
     * Neither is reachable today; both are one refactor away.
     */
    ref: z.string().regex(/^(?!-)(?!.*\.\.)[A-Za-z0-9._/-]+$/, 'not a branch name or tag'),
    sha: z.string().regex(/^[0-9a-fA-F]{7,40}$/, 'not a commit sha'),
    /** The run holding the uploaded dist. Digits — it indexes an API path. */
    run_id: z.union([z.string().regex(/^\d+$/), z.number().int().positive()]),
    /** Optional; sent by the semver'd site surfaces. */
    version: z
      .string()
      // The prerelease/build tail is the semver grammar's own character set, not
      // `.+` — which would have admitted `1.0.0+$(whoami)` and `1.0.0-; rm -rf /`.
      .regex(/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/, 'not semver')
      .optional(),
    /**
     * Optional, and only ever a cross-check: the receiver derives the base it will
     * mount at from `project`, and compares. It is constrained to a real path here
     * — `startsWith('/')` and `endsWith('/')` alone admitted `/../../var/www/`.
     */
    base: z
      .string()
      .regex(/^\/(?:[a-z0-9][a-z0-9-]*\/)+$/, 'not a mount path')
      .optional(),
    framework: z.string().min(1).optional(),
  })
  .strict()

export type DispatchPayload = z.infer<typeof dispatchPayload>
