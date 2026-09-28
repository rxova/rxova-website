import { describe, expect, it } from 'vitest'
import { parse } from 'parse5'

import { attribute, element, walkNodes } from './html.ts'

describe('html helpers', () => {
  const doc = parse(
    '<html><head><meta NAME="robots" content="noindex"></head><body>text</body></html>',
  )

  it('visits every node and reads attributes the way parse5 cases them', () => {
    const metas: (string | undefined)[] = []
    walkNodes(doc, (node) => {
      if (element('meta')(node)) metas.push(attribute(node, 'name'))
    })
    expect(metas).toEqual(['robots'])
  })

  it('reads no attribute from a node that cannot have one', () => {
    const texts: (string | undefined)[] = []
    walkNodes(doc, (node) => {
      if (node.nodeName === '#text') texts.push(attribute(node, 'name'))
    })
    expect(texts).toEqual([undefined])
  })
})
