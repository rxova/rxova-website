import { excerpt } from '@rxova/astro-ui/lib/entries'

/** How much of an entry the RSS description carries; a reader shows it under a headline. */
export const FEED_EXCERPT_CHARS = 160

/** An entry's opening prose for the feed, ending in an ellipsis when it was cut. */
export function feedExcerpt(body: string, max = FEED_EXCERPT_CHARS): string {
  const { text, truncated } = excerpt(body, max)
  return truncated ? `${text}…` : text
}
