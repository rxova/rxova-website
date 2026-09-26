import { describe, expect, it } from 'vitest'

import { errorMessage } from './errors.ts'

describe('errorMessage', () => {
  it("reads an Error's own message, without the stack", () => {
    expect(errorMessage(new TypeError('bad input'))).toBe('bad input')
  })

  it.each([
    ['a string', 'a string'],
    [42, '42'],
    [undefined, 'undefined'],
    [{ toString: () => 'custom' }, 'custom'],
  ])('stringifies a thrown non-Error %j', (thrown, message) => {
    expect(errorMessage(thrown)).toBe(message)
  })
})
