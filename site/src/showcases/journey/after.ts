import { createJourneyMachine } from '@rxova/journey-core'

type Step = 'cart' | 'address' | 'payment' | 'review'
type Checkout = { hasPhysicalItems: boolean; address: string | null }

// checkout.ts: the flow, as a machine the page subscribes to
export function createCheckout(validateAddress: (address: string | null) => Promise<boolean>) {
  const checkout = createJourneyMachine<Checkout, Step>({
    initial: 'cart',
    context: { hasPhysicalItems: true, address: null },
    steps: { cart: {}, address: {}, payment: {}, review: {} },
    transitions: {
      cart: {
        // Tried in order: the first candidate whose `when` passes wins.
        goToNextStep: [
          { to: 'address', when: ({ context }) => context.hasPhysicalItems },
          { to: 'payment' },
        ],
      },
      address: {
        // Moves only once the check resolves true. False, a throw or the timeout
        // leave the customer on address; a throw or timeout is kept as the step's error.
        goToNextStep: [
          { to: 'payment', timeoutMs: 5000, when: ({ context }) => validateAddress(context.address) },
        ],
      },
      payment: { goToNextStep: [{ to: 'review' }] },
      review: { goToStepById: [{ to: 'address' }], completeJourney: true },
    },
  })
  void checkout.startJourney()
  return checkout
}

// footer.ts: what the buttons read and call
export function footer(checkout: ReturnType<typeof createCheckout>) {
  const { async, history } = checkout.getSnapshot()
  return {
    loading: async.isLoading,
    error: async.byStep.address.error,
    canGoBack: history.index > 0,
    // Calls run one at a time: a Back pressed during the check waits for it.
    next: () => checkout.goToNextStep(),
    // Walks the recorded history: after "Edit address", Back returns to review.
    back: () => checkout.goToPreviousStep(),
    editAddress: () => checkout.goToStepById('address'),
  }
}
