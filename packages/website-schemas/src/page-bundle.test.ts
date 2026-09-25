import { describe, expect, it } from 'vitest'

import { createPageBundleManifest, pageBundleManifest } from './page-bundle.ts'

describe('pageBundleManifest', () => {
  it('creates the schema-2 page-component marker', () => {
    expect(createPageBundleManifest('blog', '/blog/')).toEqual({
      schema: 2,
      format: 'html-page-component',
      project: 'blog',
      base: '/blog/',
    })
  })

  it('rejects unsafe and unknown fields', () => {
    expect(
      pageBundleManifest.safeParse({
        schema: 2,
        format: 'html-page-component',
        project: 'blog',
        base: '/../blog/',
      }).success,
    ).toBe(false)
    expect(
      pageBundleManifest.safeParse({
        schema: 2,
        format: 'html-page-component',
        project: 'blog',
        base: '/blog/',
        shell: true,
      }).success,
    ).toBe(false)
  })
})
