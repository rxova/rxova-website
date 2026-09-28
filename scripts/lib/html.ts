// Small parse5 helpers for the scripts that read assembled HTML (noindex and redirect-stub
// detection), so every reader agrees on attribute casing.
import type { DefaultTreeAdapterTypes } from 'parse5'

type Node = DefaultTreeAdapterTypes.Node
type Element = DefaultTreeAdapterTypes.Element

const children = (node: Node): Node[] => ('childNodes' in node ? node.childNodes : [])

/** Predicate factory: matches an element by tag name. */
export const element =
  (name: string) =>
  (node: Node): node is Element =>
    'tagName' in node && node.tagName === name

/** An element's attribute value, or undefined. parse5 lower-cases both. */
export const attribute = (node: Node, name: string): string | undefined =>
  'attrs' in node ? node.attrs.find((attr) => attr.name === name)?.value : undefined

/** Visit every node in the tree, root first. */
export function walkNodes(root: Node, visit: (node: Node) => void): void {
  visit(root)
  for (const child of children(root)) walkNodes(child, visit)
}
