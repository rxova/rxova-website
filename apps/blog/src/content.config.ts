/**
 * The blog's collections.
 *
 * Frontmatter comes from `@rxova/website-schemas`, the published contract this repo's
 * pre-merge validator uses too — so what a post may say is decided once. What is
 * added here is the part only Astro can express: `reference()` for the author, and
 * `image()` for a cover.
 *
 * Authors live in this package rather than being shared with `@rxova/updates`.
 * Duplication is the deliberate trade: each surface validates its own registry, so
 * a typo'd byline still fails the build, and the worst a divergence costs is a
 * stale bio on one page.
 */

import { defineCollection, reference } from 'astro:content'
// Directly, not astro:content's re-export, which Astro 7 deprecates. Same instance
// either way now that the repo is on the zod major Astro bundles.
import { z } from 'zod'
import { glob } from 'astro/loaders'

import { postBase, authorBase, parseEntryFilename } from '@rxova/website-schemas'

/**
 * `2026-07-27T143005-some-slug.md` -> `some-slug`.
 *
 * The timestamp keeps the directory sorted in an editor the way the site sorts;
 * the frontmatter is what actually orders it. Stripping the prefix keeps it out of
 * the URL, so re-dating a post never breaks its link. The parser is shared with the
 * validator, so the two cannot disagree about what a filename means — and it throws
 * rather than guessing, since anything malformed has already failed the pre-merge
 * gate.
 */
const slugFromFilename = ({ entry }: { entry: string }): string => {
  const parsed = parseEntryFilename(entry)
  if (!parsed) {
    throw new Error(`[blog] "${entry}" is not a valid entry filename`)
  }
  return parsed.slug
}

/**
 * Where posts are read from. `./posts` in every build that ships.
 *
 * The override exists for `test/render.test.ts`, which asserts against the HTML a
 * real build emits — that a cover carries its `coverAlt`, that an embed gets a
 * srcset, that the URLs are base-prefixed and the bytes are WebP. None of that can
 * be asserted from a unit test, and the alternative ways to reach it are worse: a
 * fixture post in `posts/` would publish to rxova.org, and a second Astro project
 * built to mimic this one would assert against the mimic rather than this pipeline.
 *
 * A seam only the tests use is a real cost. It buys a test that fails when the
 * build is broken — which is precisely how `sharp` came to be missing without
 * anyone noticing.
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
