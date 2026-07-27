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

import { postBase, updateBase, authorBase } from './external/packages/content-schema/src/index'

const CONTENT = './src/external/content'

/**
 * `2026-07-27-some-slug.md` -> `some-slug`.
 *
 * The date prefix exists to keep the directory sorted in an editor; `pubDate` is
 * what actually orders the site. Stripping it here keeps that cosmetic choice out
 * of the URL, so re-dating a draft does not break its link. Brand's validator
 * enforces that the prefix and the frontmatter date agree.
 */
const slugFromFilename = ({ entry }: { entry: string }): string =>
  entry.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, '')

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
