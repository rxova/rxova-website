/**
 * The updates collections: frontmatter from `@rxova/website-schemas`, plus `reference()` for authors.
 * `repos` is checked for shape here and against @rxova/brand's REPOS by the validator.
 */

import { defineCollection, reference } from 'astro:content'
// Directly, not astro:content's re-export, which Astro 7 deprecates. Same instance
// either way now that the repo is on the zod major Astro bundles.
import { z } from 'zod'
import { glob } from 'astro/loaders'

import { updateBase, authorBase, parseEntryFilename } from '@rxova/website-schemas'

/**
 * `2026-07-27T143005-some-slug.md` -> `some-slug`, so re-dating an entry never breaks a permalink.
 * Uses the parser shared with the validator, and throws on a malformed name.
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
