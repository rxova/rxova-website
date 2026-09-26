import { nextLimit } from '../lib/entries.ts'

/** Shows `list`'s children `data-reveal-step` at a time, driven by a ShowMore's `controls`. */
export function batchList(list: HTMLElement, controls: HTMLElement): void {
  const items = Array.from(list.children) as HTMLElement[]
  const moreBtn = controls.querySelector<HTMLElement>('[data-reveal-more]')
  const allBtn = controls.querySelector<HTMLElement>('[data-reveal-all]')
  const progress = controls.querySelector<HTMLElement>('[data-reveal-progress]')

  const step = Number(list.dataset.revealStep) || items.length
  let limit = step

  function apply() {
    items.forEach((el, i) => {
      el.hidden = i >= limit
    })
    controls.hidden = limit >= items.length
    if (progress) {
      progress.textContent = limit < items.length ? `Showing ${limit} of ${items.length}` : ''
    }
  }

  /** Raise the limit, then focus the first item that appeared. */
  function reveal(next: number) {
    const first = items[limit]
    limit = next
    apply()
    if (!first) return
    // The new batch starts where the button was, so the viewport is already right.
    first.tabIndex = -1
    first.focus({ preventScroll: true })
  }

  moreBtn?.addEventListener('click', () => reveal(nextLimit(limit, step, items.length)))
  // Also the way out of find-in-page missing what is batched away.
  allBtn?.addEventListener('click', () => reveal(items.length))

  apply()
}

/** Batches the page's `[data-reveal-list]` behind its `[data-reveal-controls]`, when it has both. */
export function enhanceShowMore(root: ParentNode = document): void {
  const list = root.querySelector<HTMLElement>('[data-reveal-list]')
  const controls = root.querySelector<HTMLElement>('[data-reveal-controls]')
  if (list && controls) batchList(list, controls)
}
