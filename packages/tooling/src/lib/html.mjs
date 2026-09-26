// Small parse5 helpers shared by the scripts that read assembled HTML.
//
// These lived inside assemble.mjs while it was the only reader. sitemap.mjs now
// needs the same two questions answered — "does this document say noindex?" and
// "is it a redirect stub?" — and a second hand-rolled copy of `attribute` is how
// the two ends up disagreeing about, say, attribute-name casing.

/** Depth-first search for the first node matching `predicate`. */
export function findNode(root, predicate) {
  if (predicate(root)) return root
  for (const child of root.childNodes ?? []) {
    const found = findNode(child, predicate)
    if (found) return found
  }
}

/** Predicate factory: matches an element by tag name. */
export const element = (name) => (node) => node.tagName === name

/** An element's attribute value, or undefined. parse5 lower-cases both. */
export const attribute = (node, name) => node.attrs?.find((attr) => attr.name === name)?.value

/** Whether `node`'s class attribute contains `name`. */
export function hasClass(node, name) {
  return (attribute(node, 'class') ?? '').split(/\s+/).includes(name)
}

/** Visit every node in the tree, root first. */
export function walkNodes(root, visit) {
  visit(root)
  for (const child of root.childNodes ?? []) walkNodes(child, visit)
}
