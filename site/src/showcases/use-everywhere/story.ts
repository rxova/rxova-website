// use-everywhere: a cart open in three tabs.
//
// See ../ts-extended-errors/story.ts for how a story is put together.

import type { Showcase } from '../../lib/walkthrough'
import after from './after.tsx?raw'
import before from './before.txt?raw'

export const story: Showcase = {
  heading: 'A cart open in three tabs',
  lede: 'A shopper has the same store open in three tabs, with live prices coming from a WebSocket. An item added in any tab has to appear in all of them, and a tab opened later has to start from the same cart.',
  before: { label: 'By hand', code: before, lang: 'tsx' },
  after: { label: 'With use-everywhere', code: after, lang: 'tsx' },
  notes: [
    {
      problem:
        'Each tab builds the new list from its own copy and sends all of it. Two tabs add at once, and the list that arrives last has no item from the other.',
      fix: '`useSharedReducer` sends the action, not the list. The leader tab puts the actions in one order, and every tab applies both.',
      lines: {
        before: [
          "Built from this tab's copy",
          'const next = lines.some(',
          "channel.postMessage({ type: 'cart', lines: next })",
        ],
        after: [
          'a tab sends what it did',
          'function cart(lines: Line[], action: CartAction)',
          'useSharedReducer(cart, []',
        ],
      },
    },
    {
      problem:
        '`event.data` is `any`. Rename `lines` in the sender and the receiver still compiles, and sets the cart to `undefined`.',
      fix: 'Actions are a `CartAction` union. `dispatch` takes nothing else, and the reducer has to handle each one.',
      lines: {
        before: ['event.data is any', "if (event.data.type === 'cart')"],
        after: [
          'type CartAction =',
          "case 'add':",
          "case 'remove':",
          "dispatch({ type: 'add', sku })",
          "dispatch({ type: 'remove', sku })",
        ],
      },
    },
    {
      problem: 'The price feed opens in every tab: five tabs, five sockets to the same server.',
      fix: '`useLeaderEffect` opens the socket in one tab. When that tab closes, another takes over and opens it.',
      lines: {
        before: ['Runs in every open tab', 'new WebSocket('],
        after: ['Runs in one tab only', 'useLeaderEffect(() => {'],
      },
    },
    {
      problem:
        'A tab opened later starts with an empty cart and no prices. A `BroadcastChannel` only carries what is sent after it opens.',
      fix: 'A new tab asks the open ones for the current cart and prices, and starts from them.',
      lines: {
        before: ['A tab opened now starts here', 'useState<Line[]>([])', 'useState<Prices>({})'],
        after: [
          'A tab opened now asks',
          'handed to a new tab when it opens',
          "useSharedState<Prices>('prices', {})",
        ],
      },
    },
  ],
}
