/** What rxova-website's `sources.json` may contain. */

import { z } from 'zod'

/**
 * Source kinds and their mounts: `package` at `/packages/<id>/`, `site` at `/<id>/`, `storybook`
 * (id `storybook-<project>`) at `/storybook/<project>/`. Mounts are always derived, never written.
 */
export const SOURCE_KINDS = ['package', 'site', 'storybook'] as const
export type SourceKind = (typeof SOURCE_KINDS)[number]

/** The id prefix and mount root shared by every storybook surface. */
const STORYBOOK_PREFIX = 'storybook-'
const STORYBOOK_ROOT = 'storybook'

/** Ids reach URLs, artifact names and shell paths. Keep them boring. */
export const sourceId = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]*$/, 'lowercase letters, digits and dashes; must not start with a dash')

/**
 * Top-level paths a `site` source must not claim, since a site mounts at `/<id>/` and would
 * shadow (or be shadowed by) the landing's pages, the docs tree or the storybook root.
 */
export const RESERVED_PATHS = ['packages', 'privacy', 'terms', 'og', 'assets', 'storybook'] as const

export const sourceEntry = z
  .object({
    id: sourceId,
    kind: z.enum(SOURCE_KINDS).default('package'),
    /**
     * Absent means disabled. A project you forgot to flip on is a missing docs
     * section; one you forgot to flip off is a broken deploy.
     */
    enabled: z.boolean().default(false),
    /** Defaults to `rxova/<id>` — set it for anything built somewhere else. */
    /** `owner/name`; `.` and `..` segments are rejected since it is interpolated into API paths. */
    repo: z
      .string()
      .regex(/^(?!-)[A-Za-z0-9._-]+\/(?!-)[A-Za-z0-9._-]+$/, 'must look like owner/name')
      .refine(
        (v) => !v.split('/').some((seg) => seg === '.' || seg === '..'),
        'must not contain . or .. segments',
      )
      .optional(),
    landing: z
      .object({
        blurb: z.string().min(1).optional(),
        tags: z.array(z.string().min(1)).optional(),
      })
      .optional(),
  })
  .strict()
  .superRefine((entry, ctx) => {
    if (entry.kind === 'site' && (RESERVED_PATHS as readonly string[]).includes(entry.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['id'],
        message: `"${entry.id}" is a reserved top-level path (${RESERVED_PATHS.join(', ')})`,
      })
    }
    // A package earns a landing card and needs copy for it; a site is not a project
    // and has nothing to describe on the home page.
    if (entry.kind === 'package' && !entry.landing?.blurb) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['landing', 'blurb'],
        message: 'a package needs landing.blurb — it gets a card on the home page',
      })
    }
    if (entry.kind === 'site' && entry.landing) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['landing'],
        message: 'a site gets no landing card, so landing copy here would never render',
      })
    }
    if (entry.kind === 'storybook') {
      // The prefix keeps ids unique across kinds and is what `mountFor` strips;
      // an unprefixed id would silently mount one level up.
      if (!entry.id.startsWith(STORYBOOK_PREFIX) || entry.id === STORYBOOK_PREFIX) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['id'],
          message: `a storybook surface's id must be "${STORYBOOK_PREFIX}<project>"`,
        })
      }
      // The default `rxova/<id>` does not exist for a workshop; it is built by the
      // project's own repo, so `repo` is required.
      if (!entry.repo) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['repo'],
          message: 'a storybook surface must name the repo that builds it',
        })
      }
      if (entry.landing) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['landing'],
          message:
            'a storybook surface gets no landing card, so landing copy here would never render',
        })
      }
    }
  })

export type SourceEntry = z.infer<typeof sourceEntry>

/** Where a source mounts. The single derivation both repos agree on. */
export function mountFor(id: string, kind: SourceKind = 'package'): string {
  if (kind === 'site') return id
  if (kind === 'storybook') {
    // `storybook-react-inputs` -> `storybook/react-inputs`; the schema guarantees the prefix.
    return `${STORYBOOK_ROOT}/${id.startsWith(STORYBOOK_PREFIX) ? id.slice(STORYBOOK_PREFIX.length) : id}`
  }
  return `packages/${id}`
}

/** The base URL a source's tree must have been built for. Always `/<mount>/`. */
export function baseFor(id: string, kind: SourceKind = 'package'): string {
  return `/${mountFor(id, kind)}/`
}
