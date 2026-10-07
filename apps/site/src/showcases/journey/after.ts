import { withGraphTypes } from '@rxova/journey-core'

type Step = 'cart' | 'address' | 'payment' | 'review'
type Checkout = { hasPhysicalItems: boolean; address: string | null; addressValid: boolean }

// One declaration point for the flow's types. `results` pins what the address
// check returns, so `commit` below sees a boolean instead of `unknown`.
type CheckoutBag = {
  context: Checkout
  stepId: Step
  events: { type: 'next' } | { type: 'editAddress' }
  results: { next: boolean }
}

// checkout.ts: the flow, as a machine the page subscribes to
export function createCheckout(validateAddress: (address: string | null) => Promise<boolean>) {
  const checkout = withGraphTypes<CheckoutBag>()({
    initial: 'cart',
    context: { hasPhysicalItems: true, address: null, addressValid: false },
    steps: {
      cart: {
        // Tried in order: the first candidate whose `when` passes wins.
        on: {
          next: [
            { to: 'address', when: ({ context }) => context.hasPhysicalItems },
            { to: 'payment' },
          ],
        },
      },
      address: {
        on: {
          // `run` is awaited while the machine holds its position; `commit` stages
          // the answer, and the guard reads it — so the check decides the route
          // without the guard ever becoming async. A false answer, a throw or the
          // timeout leaves the customer on address, kept as the step's error.
          next: {
            label: 'validate address',
            timeoutMs: 5000,
            run: ({ snapshot }) => validateAddress(snapshot.context.address),
            commit: ({ result, updateContext }) =>
              updateContext((previous) => ({ ...previous, addressValid: result })),
            candidates: [{ to: 'payment', when: ({ context }) => context.addressValid }],
          },
        },
      },
      payment: { on: { next: 'review' } },
      review: { on: { editAddress: 'address' } },
    },
  })
  checkout.controls.start()
  return checkout
}

// footer.ts: what the buttons read and call
export function footer(checkout: ReturnType<typeof createCheckout>) {
  const { currentStep, history } = checkout.getSnapshot()
  return {
    loading: currentStep?.async.isLoading ?? false,
    error: currentStep?.async.error ?? null,
    canGoBack: history.canGoBack,
    // Refused while the check is in flight, so a page disables these on `loading`
    // rather than letting a click race it.
    next: () => checkout.send('next'),
    // Walks the recorded timeline: after "Edit address", Back returns to review.
    back: () => checkout.navigate.goToPreviousStep(),
    editAddress: () => checkout.send('editAddress'),
  }
}
