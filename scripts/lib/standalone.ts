/** The meta name a document uses to say it is a standalone asset (an iframe target, a demo), not a page. */
export const STANDALONE_MARKER = 'rxova-standalone'

/** Whether raw HTML declares itself standalone. Text-level, so callers can ask before parsing. */
export const declaresStandalone = (html: string): boolean =>
  new RegExp(`<meta[^>]+name=["']${STANDALONE_MARKER}["']`, 'i').test(html)
