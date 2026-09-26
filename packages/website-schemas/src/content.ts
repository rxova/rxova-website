/**
 * What a post, an update and an author may say; checked before merge by this repo's validator.
 * Each surface extends these with Astro-only fields (`reference()` bylines, `image()` covers).
 */

import { z } from 'zod'

/** Update tags, a curated enum so the filter UI has a fixed vocabulary to render. */
export const UPDATE_TAGS = [
  'release',
  'feature',
  'fix',
  'docs',
  'infra',
  'deprecation',
  'breaking',
] as const

export type UpdateTag = (typeof UPDATE_TAGS)[number]

export const updateTag = z.enum(UPDATE_TAGS)

/**
 * A repo id, as a shape only: this package must not depend on `@rxova/brand`'s `REPOS`.
 * Callers that have `REPOS` cross-check it with `unknownRepos` below.
 */
export const repoId = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]*$/, 'lowercase letters, digits and dashes')

/** Returns the repo ids missing from the registry; kept out of the schema (see `repoId`). */
export function unknownRepos(repos: readonly string[], known: readonly string[]): string[] {
  return repos.filter((r) => !known.includes(r))
}

const link = z.object({
  label: z.string().min(1),
  href: z.string().url(),
})

/** A blog post, kept permissive: everything beyond title, description and pubDate is optional. */
export const postBase = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  pubDate: z.coerce.date(),
  updatedDate: z.coerce.date().optional(),
  tags: z.array(z.string().min(1)).default([]),
  draft: z.boolean().default(false),
  /**
   * Alt text for `cover`; omit it for a decorative cover (renders `alt=""`).
   * The validator rejects alt text without a cover.
   */
  coverAlt: z.string().min(1).optional(),
})

/**
 * An update: short, dated, cross-project progress.
 * `repos` is non-empty so every entry can be reached by the updates page's repo filter.
 */
export const updateBase = z.object({
  title: z.string().min(1),
  date: z.coerce.date(),
  repos: z.array(repoId).nonempty(),
  tags: z.array(updateTag).default([]),
  /** A sketch: renders in `pnpm dev`, never in a production build. */
  draft: z.boolean().default(false),
  /** e.g. "@rxova/journey-core@1.4.0". Free text: it names someone else's tag. */
  version: z.string().min(1).optional(),
  /** Out-links — a release, a PR, a doc page. An update never restates them. */
  links: z.array(link).default([]),
})

/** An author, one file each so concurrent additions never conflict. */
export const authorBase = z.object({
  name: z.string().min(1),
  url: z.string().url().optional(),
  github: z.string().min(1).optional(),
  bio: z.string().min(1).optional(),
})

export type PostBase = z.infer<typeof postBase>
export type UpdateBase = z.infer<typeof updateBase>
export type AuthorBase = z.infer<typeof authorBase>
