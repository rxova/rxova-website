import { RXOVA_ORIGIN } from '@rxova/brand'

/**
 * Every `<a href>` in `html` that would not resolve in one request on the serving origin: an
 * absolute rxova.org URL, a relative path, or a page path without its trailing slash (a 301).
 */
export function internalLinkProblems(html: string): string[] {
  const problems: string[] = []
  for (const [, href] of html.matchAll(/<a\s[^>]*?href="([^"]*)"/g)) {
    if (href === undefined || /^(#|mailto:|tel:)/.test(href)) continue
    if (href.startsWith(RXOVA_ORIGIN)) {
      problems.push(`${href}: absolute rxova.org link; use a root-relative path`)
      continue
    }
    if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//')) continue
    if (!href.startsWith('/')) {
      problems.push(`${href}: relative link; use a root-relative path`)
      continue
    }
    const path = href.split(/[?#]/)[0] ?? ''
    const last = path.split('/').pop() ?? ''
    if (!path.endsWith('/') && !last.includes('.')) {
      problems.push(`${href}: page link without a trailing slash, which GitHub Pages redirects`)
    }
  }
  return problems
}

/**
 * An rxova.org URL as a root-relative page link with its trailing slash, or undefined for any
 * other site. For content that must store absolute URLs (feeds read them) but renders on-site.
 */
export function localHref(href: string): string | undefined {
  if (href !== RXOVA_ORIGIN && !href.startsWith(`${RXOVA_ORIGIN}/`)) return undefined
  const rest = href.slice(RXOVA_ORIGIN.length) || '/'
  const cut = rest.search(/[?#]/)
  const path = cut === -1 ? rest : rest.slice(0, cut)
  const tail = cut === -1 ? '' : rest.slice(cut)
  const last = path.split('/').pop() ?? ''
  return `${path.endsWith('/') || last.includes('.') ? path : `${path}/`}${tail}`
}
