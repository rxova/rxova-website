// The walkthroughs on the landing. Every story's notes must point at real
// lines, and where the `after` side is a module that can run outside a
// browser, it is run here — so the behaviour its comments claim is the
// behaviour the published package has. The React ones (react-inputs,
// use-everywhere) are typechecked instead, by `pnpm typecheck`.

import { describe, expect, it } from 'vitest'

import { lineMarkers } from '../lib/walkthrough'
import { showcases } from './index'
import { createCheckout, footer } from './journey/after'
import {
  CardDeclinedError,
  CheckoutError,
  RateLimitError,
  respond,
  runCheckout,
} from './ts-extended-errors/after'

describe.each(Object.entries(showcases))('%s walkthrough', (_, story) => {
  it('has notes, each pointing at a line on both sides, numbered in order', () => {
    expect(story.notes.length).toBeGreaterThan(0)
    for (const side of ['before', 'after'] as const) {
      const code = story[side].code.trimEnd()
      const markers = lineMarkers(code, story.notes, side)
      const labels = [...new Set(markers.map((marker) => marker.label))]

      expect(labels, side).toEqual(story.notes.map((_, index) => String(index + 1)))
      for (const { range } of markers) {
        expect(Number(range), side).toBeGreaterThanOrEqual(1)
        expect(Number(range), side).toBeLessThanOrEqual(code.split('\n').length)
      }
    }
  })

  it('never marks one line with two notes', () => {
    for (const side of ['before', 'after'] as const) {
      const ranges = lineMarkers(story[side].code.trimEnd(), story.notes, side).map((m) => m.range)
      expect(ranges.length, side).toBe(new Set(ranges).size)
    }
  })
})

describe('lineMarkers', () => {
  it('fails loudly for a note that points at nothing', () => {
    const notes = [{ problem: '', fix: '', lines: { before: [], after: ['missing'] } }]
    expect(() => lineMarkers('const x = 1', notes, 'after')).toThrow(/note 1: no after line has/)
  })
})

describe('ts-extended-errors: an error that has to cross a boundary', () => {
  /** What the API receives when the charge throws `cause`: the worker's result, through JSON. */
  async function overTheWire(cause: unknown) {
    const result = await runCheckout('order-7', () => Promise.reject(cause))
    expect(result.ok).toBe(false)
    return JSON.parse(JSON.stringify((result as { error: unknown }).error)) as unknown
  }

  it('reports success without an error', async () => {
    expect(await runCheckout('order-7', () => Promise.resolve())).toEqual({ ok: true })
  })

  it('sends exactly the object the comment in the worker shows', async () => {
    // That comment is what a reader takes away about the wire format, so it is
    // held to the real output rather than left to drift.
    const payload = await overTheWire(
      new RateLimitError({ context: { limit: 100, retryAfterMs: 1200 } }),
    )

    expect(payload).toEqual({
      name: 'CheckoutError',
      message: 'checkout failed',
      code: 'CHECKOUT',
      context: { orderId: 'order-7' },
      cause: {
        name: 'RateLimitError',
        message: 'rate limit of 100 hit, retry in 1200 ms',
        code: 'RATE_LIMITED',
        context: { limit: 100, retryAfterMs: 1200 },
      },
    })
    const { code } = showcases['ts-extended-errors'].after
    expect(code).toContain("context: { orderId: 'order-7' },")
    expect(code).toContain("code: 'RATE_LIMITED', context: { limit: 100, retryAfterMs: 1200 },")
  })

  it('answers 402 with the typed reason for a declined card', async () => {
    const payload = await overTheWire(
      new CardDeclinedError({ context: { reason: 'insufficient_funds', last4: '0005' } }),
    )
    expect(respond(payload)).toEqual({ status: 402, reason: 'insufficient_funds' })
  })

  it('answers 429 with the limit and the delay, however deep it is wrapped', async () => {
    const limited = new RateLimitError({ context: { limit: 100, retryAfterMs: 1200 } })
    const payload = await overTheWire(
      new CheckoutError('retrying failed', { cause: limited, context: { orderId: 'order-6' } }),
    )
    expect(respond(payload)).toEqual({ status: 429, limit: 100, retryAfterMs: 1200 })
  })

  it.each([['boom'], [null], [new Error('disk full')]])('answers 500 for %s', async (cause) => {
    expect(respond(await overTheWire(cause))).toEqual({ status: 500 })
  })
})

describe('journey: a checkout that branches, waits and goes back', () => {
  const tick = () => new Promise((resolve) => setTimeout(resolve, 0))
  const deferred = () => {
    let resolve!: (value: boolean) => void
    let reject!: (error: unknown) => void
    const promise = new Promise<boolean>((a, b) => {
      resolve = a
      reject = b
    })
    return { promise, resolve, reject }
  }
  const step = (checkout: ReturnType<typeof createCheckout>) => checkout.getSnapshot().currentStepId

  it('skips the address step for a cart with nothing to ship', async () => {
    const checkout = createCheckout(async () => true)
    await checkout.updateContext((context) => ({ ...context, hasPhysicalItems: false }))
    await footer(checkout).next()
    expect(step(checkout)).toBe('payment')
  })

  it('returns to review after "Edit address", not to the cart', async () => {
    const checkout = createCheckout(async () => true)
    await footer(checkout).next()
    await footer(checkout).next()
    await footer(checkout).next()
    expect(step(checkout)).toBe('review')
    await footer(checkout).editAddress()
    expect(step(checkout)).toBe('address')
    await footer(checkout).back()
    expect(step(checkout)).toBe('review')
  })

  it('stays on address when the check throws, and keeps the error', async () => {
    const check = deferred()
    const checkout = createCheckout(() => check.promise)
    await footer(checkout).next()
    const moving = footer(checkout).next()
    await tick()
    expect(footer(checkout).loading).toBe(true)
    check.reject(new Error('network down'))
    await moving
    expect(step(checkout)).toBe('address')
    expect(footer(checkout).loading).toBe(false)
    expect((footer(checkout).error as Error).message).toBe('network down')
  })

  it('stays on address, with no error, when the check says no', async () => {
    const checkout = createCheckout(async () => false)
    await footer(checkout).next()
    await footer(checkout).next()
    expect(step(checkout)).toBe('address')
    expect(footer(checkout).error).toBeNull()
  })

  it('makes a Back pressed during the check wait for it', async () => {
    const check = deferred()
    const checkout = createCheckout(() => check.promise)
    await footer(checkout).next()
    const moving = footer(checkout).next()
    await tick()
    const back = footer(checkout).back()
    await tick()
    expect(step(checkout)).toBe('address')
    check.resolve(true)
    await moving
    await back
    expect(step(checkout)).toBe('address')
  })

  it('gives up on a check that never answers after five seconds', async () => {
    const checkout = createCheckout(() => new Promise<boolean>(() => {}))
    await footer(checkout).next()
    await footer(checkout).next()
    expect(step(checkout)).toBe('address')
    expect(footer(checkout).loading).toBe(false)
    expect(footer(checkout).error).toBeInstanceOf(Error)
  })
})
