/**
 * What a repo sends when a build is ready. Everything here crosses a trust
 * boundary, so the cases that matter most are the refusals.
 */

import { describe, expect, it } from 'vitest'

import { dispatchPayload } from './dispatch.ts'

describe('dispatchPayload', () => {
  const base = { schema: 1, project: 'journey', ref: 'main', sha: 'abc1234', run_id: '123' }

  it('accepts a docs dispatch with no version', () => {
    expect(dispatchPayload.parse(base).version).toBeUndefined()
  })

  it('accepts page-component bundle dispatches', () => {
    expect(dispatchPayload.parse({ ...base, schema: 2 }).schema).toBe(2)
  })

  it('accepts a numeric run_id as well as a string', () => {
    expect(dispatchPayload.safeParse({ ...base, run_id: 123 }).success).toBe(true)
  })

  it('accepts a semver version from a site surface', () => {
    expect(dispatchPayload.parse({ ...base, project: 'blog', version: '1.2.0' }).version).toBe(
      '1.2.0',
    )
  })

  // This crosses a trust boundary: run_id indexes an API path, and ref and sha
  // reach release notes. Nothing here is trusted because the sender said so.
  it.each([
    ['a run_id that is not digits', { ...base, run_id: '1; rm -rf /' }],
    ['a ref with characters a ref cannot hold', { ...base, ref: 'main$(whoami)' }],
    ['a sha that is not hex', { ...base, sha: 'zzzzzzz' }],
    ['a version that is not semver', { ...base, version: 'v1' }],
    ['an unknown field', { ...base, extra: 'x' }],
    ['a schema version this does not speak', { ...base, schema: 3 }],
  ])('refuses %s', (_label, value) => {
    expect(dispatchPayload.safeParse(value).success).toBe(false)
  })
})
