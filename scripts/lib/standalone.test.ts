import { describe, expect, it } from 'vitest'

import { declaresStandalone } from './standalone.ts'

describe('declaresStandalone', () => {
  it.each([
    '<meta name="rxova-standalone">',
    "<meta content='' name='rxova-standalone'>",
    '<META NAME="rxova-standalone">',
  ])('finds the marker in %s', (html) => expect(declaresStandalone(html)).toBe(true))

  it.each(['<main></main>', '<meta name="rxova-head-slot">', '<p>rxova-standalone</p>'])(
    'finds no marker in %s',
    (html) => expect(declaresStandalone(html)).toBe(false),
  )
})
