/**
 * The blog's collections: frontmatter from `@rxova/website-schemas`, plus `reference()` and `image()`.
 * Authors live here, not shared with `@rxova/updates`, so a typo'd byline still fails this build.
 */

import { defineCollection, reference } from 'astro:content'
// Directly, not astro:content's re-export, which Astro 7 deprecates. Same instance
// either way now that the repo is on the zod major Astro bundles.
import { z } from 'zod'
import { glob } from 'astro/loaders'

import { postBase, authorBase, parseEntryFilename } from '@rxova/website-schemas'

/**
 * `2026-07-27T143005-some-slug.md` -> `some-slug`, so re-dating a post never breaks its link.
 * Uses the parser shared with the validator, and throws on a malformed name.
 */
const slugFromFilename = ({ entry }: { entry: string }): string => {
  const parsed = parseEntryFilename(entry)
  if (!parsed) {
    throw new Error(`[blog] "${entry}" is not a valid entry filename`)
  }
  return parsed.slug
}

/**
 * Where posts are read from: `./posts` in every build that ships.
 * `test/render.test.ts` points it at fixtures so it can assert on a real build's HTML.
 */
const POSTS_DIR = process.env.BLOG_POSTS_DIR ?? './posts'

const blog = defineCollection({
  loader: glob({ base: POSTS_DIR, pattern: '**/*.md', generateId: slugFromFilename }),
  schema: ({ image }) =>
    postBase.extend({
      authors: z.array(reference('authors')).nonempty(),
      cover: image().optional(),
    }),
})

const authors = defineCollection({
  loader: glob({ base: './authors', pattern: '**/*.md' }),
  schema: authorBase,
})

export const collections = { blog, authors }
