/** Rules that make two builds of the same site compare equal, so only real changes show. */
import { parse, serialize, type DefaultTreeAdapterTypes } from 'parse5'
import { format } from 'prettier'

type Node = DefaultTreeAdapterTypes.Node
type Element = DefaultTreeAdapterTypes.Element
type ParentNode = DefaultTreeAdapterTypes.ParentNode

const ASSET_EXTENSIONS = 'css|js|mjs|woff2?|png|jpe?g|svg|webp|avif|gif'
const HASHED_ASSET = new RegExp(
  `(_astro\\/[^"'\\s()<>]*?)\\.[A-Za-z0-9_-]{5,12}\\.(${ASSET_EXTENSIONS})\\b`,
  'g',
)

/** `_astro/index.Dblw5D6P.css` → `_astro/index.[hash].css`, in paths and in text. */
export function maskAssetHashes(text: string): string {
  return text.replace(HASHED_ASSET, '$1.[hash].$2')
}

/** Astro's per-component scope ids change when a component moves; its scoping does not. */
export function maskScopeIds(text: string): string {
  return text.replace(/data-astro-cid-[a-z0-9]+/g, 'data-cid')
}

export function stripCssComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

const isElement = (node: Node): node is Element => 'tagName' in node
const attr = (element: Element, name: string) => element.attrs.find((a) => a.name === name)?.value

function* walk(parent: ParentNode): Generator<{ node: Node; parent: ParentNode }> {
  for (const node of [...parent.childNodes]) {
    yield { node, parent }
    if ('childNodes' in node) yield* walk(node)
    if ('content' in node) yield* walk(node.content)
  }
}

const isStylesheetLink = (element: Element) =>
  element.tagName === 'link' && (attr(element, 'rel') ?? '').split(/\s+/).includes('stylesheet')

/**
 * Splits a page into its markup and the CSS it applies, in document order.
 *
 * Refactors move CSS between Astro's chunks without changing what a page applies, so a
 * page's styles are compared as one sheet rather than as the files that happen to carry them.
 */
export async function splitPageStyles(
  html: string,
  readStylesheet: (href: string) => Promise<string | undefined>,
): Promise<{ html: string; css: string }> {
  const document = parse(html)
  const parts: string[] = []
  for (const { node, parent } of walk(document)) {
    if (!isElement(node)) continue
    let css: string | undefined
    if (isStylesheetLink(node)) {
      const href = attr(node, 'href') ?? ''
      // An at-rule rather than a comment, so the marker survives comment stripping.
      css = (await readStylesheet(href)) ?? `@unresolved-stylesheet "${href}";`
    } else if (node.tagName === 'style') {
      css = serialize(node)
    } else {
      continue
    }
    parts.push(css)
    parent.childNodes.splice(parent.childNodes.indexOf(node), 1)
  }
  return { html: serialize(document), css: parts.join('\n') }
}

async function pretty(text: string, parser: 'html' | 'css' | 'json'): Promise<string> {
  try {
    return await format(text, { parser, printWidth: 100 })
  } catch {
    // Minified output Prettier cannot parse still diffs usefully as it is.
    return text
  }
}

/** Drops comment nodes from parsed markup, so no comment text survives to the diff. */
export function stripHtmlComments(html: string): string {
  const document = parse(html)
  for (const { node, parent } of walk(document)) {
    if (node.nodeName === '#comment') parent.childNodes.splice(parent.childNodes.indexOf(node), 1)
  }
  return serialize(document)
}

/** The comparable form of an HTML page's markup. */
export function normaliseHtml(html: string): Promise<string> {
  return pretty(maskScopeIds(maskAssetHashes(stripHtmlComments(html))), 'html')
}

/** The comparable form of a page's CSS. */
export function normaliseCss(css: string): Promise<string> {
  return pretty(maskScopeIds(maskAssetHashes(stripCssComments(css))), 'css')
}

/** The comparable form of any other text output (XML, JSON, plain text). */
export function normaliseText(text: string, extension: string): Promise<string> | string {
  const masked = maskAssetHashes(text)
  return extension === '.json' || extension === '.webmanifest' ? pretty(masked, 'json') : masked
}
