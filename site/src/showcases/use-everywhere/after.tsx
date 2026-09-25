import { useLeaderEffect, useSharedReducer, useSharedState } from 'use-everywhere'

type Line = { sku: string; qty: number }
type Prices = Record<string, number>
type CartAction = { type: 'add'; sku: string } | { type: 'remove'; sku: string }

// cart.ts: a tab sends what it did, and every tab applies the same actions in the same order
function cart(lines: Line[], action: CartAction): Line[] {
  switch (action.type) {
    case 'add':
      return lines.some((line) => line.sku === action.sku)
        ? lines.map((line) => (line.sku === action.sku ? { ...line, qty: line.qty + 1 } : line))
        : [...lines, { sku: action.sku, qty: 1 }]
    case 'remove':
      return lines.filter((line) => line.sku !== action.sku)
  }
}

export function useCart() {
  // A tab opened now asks the open tabs for the cart, and starts from theirs
  const [lines, dispatch] = useSharedReducer(cart, [], { key: 'cart' })
  return {
    lines,
    add: (sku: string) => dispatch({ type: 'add', sku }),
    remove: (sku: string) => dispatch({ type: 'remove', sku }),
  }
}

// prices.ts: live prices for what is in the cart
export function usePrices() {
  // The same value in every tab, and handed to a new tab when it opens
  const [prices, setPrices] = useSharedState<Prices>('prices', {})

  // Runs in one tab only, and moves to another tab when that one closes
  useLeaderEffect(() => {
    const socket = new WebSocket('wss://shop.example.com/prices')
    socket.onmessage = (event) => setPrices(JSON.parse(event.data))
    return () => socket.close()
  })

  return prices
}

// CartSummary.tsx: the same component in every tab
export function CartSummary() {
  const { lines, add, remove } = useCart()
  const prices = usePrices()
  const total = lines.reduce((sum, line) => sum + line.qty * (prices[line.sku] ?? 0), 0)

  return (
    <ul>
      {lines.map((line) => (
        <li key={line.sku}>
          {line.sku} × {line.qty}
          <button onClick={() => add(line.sku)}>+1</button>
          <button onClick={() => remove(line.sku)}>Remove</button>
        </li>
      ))}
      <li>Total {total.toFixed(2)}</li>
    </ul>
  )
}
