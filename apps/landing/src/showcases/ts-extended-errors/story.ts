// ts-extended-errors: an error that has to cross a boundary. `after` is a real module
// run by showcases.test.ts; `before` is wrong on purpose, so it is kept as text.

import type { Showcase } from '../../lib/walkthrough'
import after from './after.ts?raw'
import before from './before.txt?raw'

export const story: Showcase = {
  heading: 'An error that has to cross a boundary',
  lede: 'A worker charges a card and the charge fails. On the other side of a JSON hop, the API must decide whether to retry, or to tell the customer why.',
  before: { label: 'By hand', code: before, lang: 'ts' },
  after: { label: 'With ts-extended-errors', code: after, lang: 'ts' },
  notes: [
    {
      problem:
        'Every class declares and assigns each field, sets its `name` and fixes its prototype.',
      fix: '`defineError` writes the class, its code and its message, all from one context type.',
      lines: {
        before: [
          "this.name = 'CardDeclinedError'",
          'this.reason = reason',
          'this.last4 = last4',
          "this.name = 'RateLimitError'",
          'this.limit = limit',
          'this.retryAfterMs = retryAfterMs',
          'Object.setPrototypeOf',
        ],
        after: [
          'type CardDeclined =',
          'type RateLimited =',
          "defineError<CardDeclined>('CardDeclinedError'",
          "code: 'CARD_DECLINED'",
          'message: ({ reason, last4 })',
          "defineError<RateLimited>('RateLimitError'",
          "code: 'RATE_LIMITED'",
          'message: ({ limit, retryAfterMs })',
          '`rate limit of',
          'defineError<{ orderId',
        ],
      },
    },
    {
      problem:
        'A payload type and a `toPayload` branch for every class. Add a field and forget one, and it stays behind.',
      fix: '`serializeError` handles every class the same way: name, code, context and the whole cause chain.',
      lines: {
        before: [
          'type CardDeclinedPayload',
          'type RateLimitPayload',
          'if (e instanceof CardDeclinedError) return',
          'if (e instanceof RateLimitError) return',
        ],
        after: ['serializeError(error'],
      },
    },
    {
      problem:
        'A type guard and a `fromPayload` branch for every class, to recognise the payload and rebuild it.',
      fix: '`deserializeError` rebuilds the real classes from the list it is given. There are no guards to write.',
      lines: {
        before: [
          'const isCardDeclined',
          "p?.name === 'CardDeclinedError'",
          'const isRateLimit',
          "p?.name === 'RateLimitError'",
          'if (isCardDeclined(p))',
          'if (isRateLimit(p))',
        ],
        after: ['deserializeError(payload', 'classes: [CheckoutError'],
      },
    },
    {
      problem:
        'Only the outer error travels. Wrap it to add the order id, and `toPayload` no longer knows it: a 500.',
      fix: 'The wrapper carries the order id, its `cause` travels with it, and `findCauseOf` finds it at any depth.',
      lines: {
        before: ['No orderId: wrapping e', 'error: toPayload(e)'],
        after: [
          "new CheckoutError('checkout failed'",
          'findCauseOf(error, RateLimitError)',
          'findCauseOf(error, CardDeclinedError)',
        ],
      },
    },
  ],
}
