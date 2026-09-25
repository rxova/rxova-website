/**
 * What a post, an update and an author may say.
 *
 * Written in `@rxova/blog` and `@rxova/updates`, checked before a merge by this
 * repo's validator, and extended by each surface with the fields only Astro can
 * express — `reference()` for a byline, `image()` for a cover.
 */

import { z } from 'zod'

/**
 * Update tags, curated rather than freeform.
 *
 * A filter UI is only as good as its vocabulary: left open, this becomes
 * `release`, `releases` and `Release` inside a month — three chips that each match
 * a third of the entries, with nothing to flag it. An enum also lets the updates
 * page render the complete tag set instead of deriving it from whatever happens to
 * exist today.
 *
 * The usual objection to enums — "adding one means a release" — does not apply
 * here: schema and content share a repo, so a new tag is one PR.
 */
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
 * A repo id, as a shape only.
 *
 * This deliberately does NOT check the id against `@rxova/brand`'s `REPOS`. It used
 * to, by reaching into that package's source with a relative import — which was fine
 * while this package was workspace-private and resolved on disk, and became a broken
 * entry point the moment it was published: the file is outside `files`, and
 * `@rxova/brand` is not a dependency, so `import '@rxova/website-schemas'` would fail to
 * resolve for anyone installing it.
 *
 * Depending on `@rxova/brand` to fix that would put the design system underneath the
 * contracts that describe it, which is upside down. So the registry check moved to
 * where the registry actually lives: `assertKnownRepos` below, called by this repo's
 * validator and by the apps that render updates, both of which have `REPOS` to hand.
 */
export const repoId = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]*$/, 'lowercase letters, digits and dashes')

/**
 * Cross-check an update's repos against the registry.
 *
 * Separate from the schema because the schema is published and the registry is not
 * — see `repoId`. Returns the ids it did not recognise, so the caller can report
 * them the way its own errors read.
 */
export function unknownRepos(repos: readonly string[], known: readonly string[]): string[] {
  return repos.filter((r) => !known.includes(r))
}

const link = z.object({
  label: z.string().min(1),
  href: z.string().url(),
})

/**
 * A blog post: essays, rationale, deep dives.
 *
 * Kept deliberately permissive — `tags` and `draft` have defaults and everything
 * beyond title/description/pubDate is optional. Widening a contract later is free;
 * narrowing one means editing every entry that already exists.
 */
export const postBase = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  pubDate: z.coerce.date(),
  updatedDate: z.coerce.date().optional(),
  tags: z.array(z.string().min(1)).default([]),
  draft: z.boolean().default(false),
  /**
   * Alt text for `cover`.
   *
   * Here rather than beside `cover` in the blog's collection because it is plain
   * text: `image()` is the only part of a cover Astro has to express, and keeping
   * the rest in the shared contract is what lets the pre-merge validator see it.
   *
   * Optional, and omitting it is a real choice rather than an oversight to nag
   * about — a cover that only sets a mood is decorative, and the accessible
   * markup for decoration is `alt=""`, not a description of the artwork. So the
   * renderer falls back to empty. What the validator does enforce is that alt
   * text without a cover is a mistake.
   */
  coverAlt: z.string().min(1).optional(),
})

/**
 * An update: short, dated, cross-project progress.
 *
 * `repos` is non-empty because the updates page is a *filterable* stream — an entry
 * that is about nothing can never be filtered to, and would only ever surface in
 * the unfiltered view.
 *
 * `draft` is the same flag a post carries, and deliberately not a second word for it:
 * a sketch is an entry that is written down but not published, and one surface having
 * `draft` while the other had `sketch` would mean explaining twice which is which.
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

/**
 * An author.
 *
 * One file per author rather than a shared list, so two people adding themselves
 * in the same window never conflict. There is one author today; the registry
 * exists anyway because moving a directory later is cheap and rewriting `authors:`
 * across every entry is not.
 */
export const authorBase = z.object({
  name: z.string().min(1),
  url: z.string().url().optional(),
  github: z.string().min(1).optional(),
  bio: z.string().min(1).optional(),
})

export type PostBase = z.infer<typeof postBase>
export type UpdateBase = z.infer<typeof updateBase>
export type AuthorBase = z.infer<typeof authorBase>
