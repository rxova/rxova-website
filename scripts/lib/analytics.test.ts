import { describe, expect, it } from 'vitest'

import { BEACON_SRC, beaconTag, withAnalytics } from './analytics.ts'

const page = '<html><head><title>Docs</title></head><body><main>Docs</main></body></html>'

describe('withAnalytics', () => {
  it('puts the beacon at the end of the head', () => {
    expect(withAnalytics(page, 't0k')).toBe(
      `<html><head><title>Docs</title>${beaconTag('t0k')}</head><body><main>Docs</main></body></html>`,
    )
  })

  it('writes the token as an escaped JSON attribute', () => {
    expect(beaconTag('a"&b')).toBe(
      `<script type="module" src="${BEACON_SRC}" data-cf-beacon="{&quot;token&quot;:&quot;a\\&quot;&amp;b&quot;}"></script>`,
    )
  })

  it('leaves a page that already loads the beacon alone', () => {
    const counted = withAnalytics(page, 't0k')
    expect(withAnalytics(counted, 'other')).toBe(counted)
  })

  it('leaves standalone assets, redirect stubs and headless fragments alone', () => {
    const standalone =
      '<html><head><meta name="rxova-standalone" content=""></head><body></body></html>'
    const redirect = '<html><head><meta http-equiv="refresh" content="0;url=/x/"></head></html>'
    const fragment = '<p>no head</p>'
    for (const html of [standalone, redirect, fragment]) {
      expect(withAnalytics(html, 't0k')).toBe(html)
    }
  })
})
