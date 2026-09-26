// Small parse5 helpers shared by the scripts that read assembled HTML.
//
// These lived inside assemble.ts while it was the only reader. sitemap.ts now
// needs the same two questions answered — "does this document say noindex?" and
// "is it a redirect stub?" — and a second hand-rolled copy of `attribute` is how
// the two ends up disagreeing about, say, attribute-name casing.
import type { DefaultTreeAdapterTypes } from 'parse5'

export type Node = DefaultTreeAdapterTypes.Node
export type Element = DefaultTreeAdapterTypes.Element
export type ParentNode = DefaultTreeAdapterTypes.ParentNode
export type ChildNode = DefaultTreeAdapterTypes.ChildNode

const children = (node: Node): Node[] => ('childNodes' in node ? node.childNodes : [])

/** Depth-first search for the first node matching `predicate`. */
export function findNode<T extends Node>(
  root: Node,
  predicate: (node: Node) => node is T,
): T | undefined
export function findNode(root: Node, predicate: (node: Node) => boolean): Node | undefined
export function findNode(root: Node, predicate: (node: Node) => boolean): Node | undefined {
  if (predicate(root)) return root
  for (const child of children(root)) {
    const found = findNode(child, predicate)
    if (found) return found
  }
  return undefined
}

/** Predicate factory: matches an element by tag name. */
export const element =
  (name: string) =>
  (node: Node): node is Element =>
    'tagName' in node && node.tagName === name

/** An element's attribute value, or undefined. parse5 lower-cases both. */
export const attribute = (node: Node, name: string): string | undefined =>
  'attrs' in node ? node.attrs.find((attr) => attr.name === name)?.value : undefined

/** Whether `node`'s class attribute contains `name`. */
export function hasClass(node: Node, name: string): boolean {
  return (attribute(node, 'class') ?? '').split(/\s+/).includes(name)
}

/** Matches any element carrying `name`, e.g. a slot marker. */
export const withAttribute =
  (name: string) =>
  (node: Node): node is Element =>
    attribute(node, name) !== undefined

/** Visit every node in the tree, root first. */
export function walkNodes(root: Node, visit: (node: Node) => void): void {
  visit(root)
  for (const child of children(root)) walkNodes(child, visit)
}
