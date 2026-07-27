/**
 * The blog, updates and author collections.
 *
 * All three read markdown out of `src/external` — a checkout of `rxova/brand`,
 * placed there by `deploy.yml` in CI and by `pnpm content:sync` locally. The
 * content is not in this repo on purpose: see docs/CONTENT-ARCHITECTURE.md.
 *
 * The schema comes out of the *same checkout*, so the fields these collections
 * accept and the fields brand's pre-merge validator enforces are always the same
 * commit. There is no package to publish and no version to keep in step — drift is
 * unrepresentable rather than managed.
 *
 * What is added here and not shared: `reference()` and `image()`. Both are injected
 * by Astro and cannot exist in a plain Node validator, so the shared part is the
 * plain fields and each side extends it with what only it can express. Brand's
 * validator does the on-disk equivalents plus two checks Astro cannot make at all
 * (that an author id has a file, that a cover path resolves).
 */

import { defineCollection, reference, z } from 'astro:content'
import { glob } from 'astro/loaders'

import {
  postBase,
  updateBase,
  authorBase,
  parseEntryFilename,
} from './external/packages/content-schema/src/index'

const CONTENT = './src/external/content'

/**
 * `2026-07-27T143005-some-slug.md` -> `some-slug`.
 *
 * The filename carries a full UTC timestamp so the directory sorts in an editor the
 * way the site sorts; the frontmatter is what actually orders the site. Stripping the
 * prefix here keeps it out of the URL, so re-dating an entry never breaks its link.
 *
 * The parser comes from the schema package rather than a regex written here, for the
 * same reason the schema does: brand's validator uses the same function, so the two
 * repos cannot disagree about what a filename means. It rejects anything malformed,
 * but that has already failed brand's pre-merge gate — so this throws rather than
 * quietly publishing an entry at a URL nobody intended.
 */
const slugFromFilename = ({ entry }: { entry: string }): string => {
  const parsed = parseEntryFilename(entry)
  if (!parsed) {
    throw new Error(
      `[content] "${entry}" is not a valid entry filename — ` +
        'expected YYYY-MM-DDTHHMMSS-<slug>.md',
    )
  }
  return parsed.slug
}

const blog = defineCollection({
  loader: glob({ base: `${CONTENT}/posts`, pattern: '**/*.md', generateId: slugFromFilename }),
  schema: ({ image }) =>
    postBase.extend({
      authors: z.array(reference('authors')).nonempty(),
      cover: image().optional(),
    }),
})

const updates = defineCollection({
  loader: glob({ base: `${CONTENT}/updates`, pattern: '**/*.md', generateId: slugFromFilename }),
  schema: updateBase.extend({
    authors: z.array(reference('authors')).nonempty(),
  }),
})

const authors = defineCollection({
  loader: glob({ base: `${CONTENT}/authors`, pattern: '**/*.md' }),
  schema: authorBase,
})

export const collections = { blog, updates, authors }
