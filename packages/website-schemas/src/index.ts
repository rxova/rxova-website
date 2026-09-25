/**
 * The contracts between the rxova repos.
 *
 * Three boundaries, one published package, so neither side of any of them is
 * hand-rolled and free to drift:
 *
 * - **Content frontmatter** (`content.ts`) — what a post, an update and an author
 *   may say. Written in `@rxova/blog` and `@rxova/updates`, checked before a merge
 *   by this repo's validator.
 * - **Registry entries** (`registry.ts`) — what rxova-website's `sources.json` may
 *   contain, and the derivation both repos agree a mount follows from.
 * - **The ingest dispatch** (`dispatch.ts`) — what a repo sends when a build is
 *   ready, every field constrained because it arrives from outside.
 *
 * Plus `filenames.ts`, which the content contract and both renderers lean on.
 *
 * This file is re-exports only. Consumers import from the package root; the split
 * exists so each contract can be read, tested and covered on its own — a 350-line
 * module reports one coverage number for four unrelated things.
 */

export * from './filenames.ts'
export * from './content.ts'
export * from './registry.ts'
export * from './dispatch.ts'
export * from './page-bundle.ts'
