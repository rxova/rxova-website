/**
 * The updates collections.
 *
 * Frontmatter comes from `@rxova/website-schemas`, the published contract this repo's
 * pre-merge validator uses too — so what an entry may say is decided once. What is
 * added here is the part only Astro can express: `reference()` for the author.
 *
 * Authors live in this package rather than being shared with `@rxova/blog`.
 * Duplication is the deliberate trade: each surface validates its own registry, so
 * a typo'd byline still fails the build, and the worst a divergence costs is a
 * stale bio on one page.
 *
 * `repos` is validated for shape here and against the real registry by the
 * validator — `@rxova/website-schemas` is published and deliberately cannot see
 * `@rxova/brand`'s REPOS, which is what kept its entry point resolvable.
 */

import { defineCollection, reference } from 'astro:content'
// Directly, not astro:content's re-export, which Astro 7 deprecates. Same instance
// either way now that the repo is on the zod major Astro bundles.
import { z } from 'zod'
import { glob } from 'astro/loaders'

import { updateBase, authorBase, parseEntryFilename } from '@rxova/website-schemas'

/**
 * `2026-07-27T143005-some-slug.md` -> `some-slug`.
 *
 * The timestamp keeps the directory sorted in an editor the way the page sorts;
 * the frontmatter is what actually orders it. Stripping the prefix keeps it out of
 * the anchor, so re-dating an entry never breaks a permalink. The parser is shared
 * with the validator, so the two cannot disagree about what a filename means — and
 * it throws rather than guessing, since anything malformed has already failed the
 * pre-merge gate.
 */
const slugFromFilename = ({ entry }: { entry: string }): string => {
  const parsed = parseEntryFilename(entry)
  if (!parsed) {
    throw new Error(`[updates] "${entry}" is not a valid entry filename`)
  }
  return parsed.slug
}

const updates = defineCollection({
  loader: glob({ base: './updates', pattern: '**/*.md', generateId: slugFromFilename }),
  schema: updateBase.extend({
    authors: z.array(reference('authors')).nonempty(),
  }),
})

const authors = defineCollection({
  loader: glob({ base: './authors', pattern: '**/*.md' }),
  schema: authorBase,
})

export const collections = { updates, authors }
