/**
 * The site's collections: blog posts, update entries and the one author registry both byline
 * against. Frontmatter comes from `@rxova/website-schemas`, plus `reference()` and `image()`.
 */

import { defineCollection, reference } from 'astro:content'
// Directly, not astro:content's re-export, which Astro 7 deprecates. The repo pins the
// zod major Astro bundles, so both resolve to the same instance.
import { z } from 'zod'
import { glob } from 'astro/loaders'

import { postBase, updateBase, authorBase, parseEntryFilename } from '@rxova/website-schemas'

/**
 * `2026-07-27T143005-some-slug.md` -> `some-slug`, so re-dating an entry never breaks its link.
 * Uses the parser shared with the validator, and throws on a malformed name.
 */
const slugFromFilename =
  (collection: string) =>
  ({ entry }: { entry: string }): string => {
    const parsed = parseEntryFilename(entry)
    if (!parsed) {
      throw new Error(`[${collection}] "${entry}" is not a valid entry filename`)
    }
    return parsed.slug
  }

/**
 * Where posts are read from: `./content/posts` in every build that ships.
 * `test/blog-render.test.ts` points it at fixtures so it can assert on a real build's HTML.
 */
const POSTS_DIR = process.env.BLOG_POSTS_DIR ?? './content/posts'

const blog = defineCollection({
  loader: glob({ base: POSTS_DIR, pattern: '**/*.md', generateId: slugFromFilename('blog') }),
  schema: ({ image }) =>
    postBase.extend({
      authors: z.array(reference('authors')).nonempty(),
      cover: image().optional(),
    }),
})

const updates = defineCollection({
  loader: glob({
    base: './content/updates',
    pattern: '**/*.md',
    generateId: slugFromFilename('updates'),
  }),
  schema: updateBase.extend({
    authors: z.array(reference('authors')).nonempty(),
  }),
})

const authors = defineCollection({
  loader: glob({ base: './content/authors', pattern: '**/*.md' }),
  schema: authorBase,
})

export const collections = { blog, updates, authors }
