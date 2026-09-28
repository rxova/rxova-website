import { declaresStandalone } from './standalone.ts'

/** Cloudflare Web Analytics' beacon, the one script the site's own pages load for analytics. */
export const BEACON_SRC = 'https://static.cloudflareinsights.com/beacon.min.js'

const escapeAttribute = (value: string): string =>
  value.replaceAll('&', '&amp;').replaceAll('"', '&quot;')

/** The beacon tag for `token`, the same markup the site's CloudflareAnalytics component renders. */
export const beaconTag = (token: string): string =>
  `<script type="module" src="${BEACON_SRC}" data-cf-beacon="${escapeAttribute(JSON.stringify({ token }))}"></script>`

/**
 * Adds the beacon to a docs page published verbatim. Standalone assets, redirect stubs, pages
 * that already load it and documents with no `</head>` come back unchanged.
 */
export function withAnalytics(html: string, token: string): string {
  if (html.includes(BEACON_SRC) || declaresStandalone(html)) return html
  if (/<meta[^>]+http-equiv=["']refresh["']/i.test(html)) return html
  const headEnd = html.search(/<\/head>/i)
  if (headEnd === -1) return html
  return `${html.slice(0, headEnd)}${beaconTag(token)}${html.slice(headEnd)}`
}
