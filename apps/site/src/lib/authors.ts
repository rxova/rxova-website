/**
 * Resolves `reference('authors')` bylines to their entries, for the blog and the updates alike.
 * `reference()` already fails the build on an unknown id, so a miss here throws.
 */

import { getEntry } from "astro:content";

export async function resolveAuthors(
  refs: readonly { id: string }[],
): Promise<{ id: string; name: string; url?: string }[]> {
  return Promise.all(
    refs.map(async ({ id }) => {
      const entry = await getEntry("authors", id);
      if (!entry) throw new Error(`[authors] "${id}" has no entry`);
      return { id, name: entry.data.name, url: entry.data.url };
    }),
  );
}
