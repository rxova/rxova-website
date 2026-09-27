// journey: a checkout that branches, waits and goes back.
//
// See ../ts-extended-errors/story.ts for how a story is put together.

import type { Showcase } from '../../lib/walkthrough'
import after from './after.ts?raw'
import before from './before.txt?raw'

export const story: Showcase = {
  heading: 'A checkout that branches, waits and goes back',
  lede: 'Carts with nothing to ship skip the address step, the address is checked with the server before payment, and the review step links back to edit it. Back has to return the customer to where they came from.',
  before: { label: 'By hand', code: before, lang: 'ts' },
  after: { label: 'With journey', code: after, lang: 'ts' },
  notes: [
    {
      problem:
        'The route is an `if` chain inside `next()`, with the branch for carts that ship nothing buried in it.',
      fix: 'Each step lists where `goToNextStep` can go. Candidates are tried in order, and the first whose `when` passes wins.',
      lines: {
        before: [
          "if (state.step === 'cart')",
          "set({ step: state.checkout.hasPhysicalItems ? 'address' : 'payment' })",
          "} else if (state.step === 'address')",
          "} else if (state.step === 'payment')",
          "set({ step: 'review' })",
        ],
        after: [
          'Tried in order',
          "{ to: 'address', when: ({ context }) => context.hasPhysicalItems }",
          "{ to: 'payment' },",
          'payment: { goToNextStep',
        ],
      },
    },
    {
      problem:
        '`back()` works the route out again in reverse, so it forgets how the customer got there. Back after Edit address goes to `cart`, not `review`.',
      fix: 'The machine records the history, and `goToPreviousStep` walks it: Back after Edit address returns to `review`.',
      lines: {
        before: [
          'The route again, backwards',
          "if (state.step === 'review') set({ step: 'payment' })",
          "else if (state.step === 'payment') set(",
          "else if (state.step === 'address') set({ step: 'cart' })",
          'Back from there goes to cart',
        ],
        after: [
          'review: { goToStepById',
          'canGoBack: history.index > 0',
          'Walks the recorded history',
          'back: () => checkout.goToPreviousStep()',
        ],
      },
    },
    {
      problem:
        '`next()` awaits the address check and then moves, even if the customer pressed Back in the meantime. A request that hangs never ends.',
      fix: "The check is the transition's `when`, with a `timeoutMs`. Calls run one at a time, so a Back pressed during the check waits for it.",
      lines: {
        before: [
          'const ok = await validateAddress',
          'The user may have pressed Back meanwhile',
          "if (ok) set({ step: 'payment' })",
          'No timeout',
        ],
        after: [
          'Moves only once the check resolves true',
          "{ to: 'payment', timeoutMs: 5000, when:",
          'Calls run one at a time',
        ],
      },
    },
    {
      problem:
        '`loading` and `error` are set by hand around the one await, in the right order, for every step that does work.',
      fix: "The machine keeps them: `async.isLoading` while the check runs, and the step's `error` if it throws or times out.",
      lines: {
        before: [
          'loading: false,',
          'error: null as unknown,',
          'set({ loading: true, error: null })',
          'set({ error })',
          'set({ loading: false })',
        ],
        after: [
          'leave the customer on address',
          'loading: async.isLoading',
          'error: async.byStep.address.error',
        ],
      },
    },
  ],
}
