/** Filters, batching and deep links for the updates stream. The rules live in ../lib/stream.ts. */
import { nextLimit } from '@rxova/astro-ui/lib/entries'

import {
  countText,
  facets,
  filtersUrl,
  isFiltered,
  place,
  progressText,
  readFilters,
  type Filters,
} from '../lib/stream'

export function enhanceStream(): void {
  const stream = document.querySelector<HTMLElement>('[data-stream]')
  if (!stream) return

  // No filter block on `/updates/repos/<id>`, but batching still runs there.
  const root = document.querySelector<HTMLElement>('[data-filters]')
  const entries = Array.from(stream.querySelectorAll<HTMLElement>('.entry'))
  const entryFacets = entries.map((el) => facets(el.dataset.repos, el.dataset.tags))
  const repoChips = Array.from(root?.querySelectorAll<HTMLElement>('[data-repo]') ?? [])
  const tagChips = Array.from(root?.querySelectorAll<HTMLElement>('[data-tag]') ?? [])
  const tagRow = root?.querySelector<HTMLElement>('[data-tag-row]')
  const count = root?.querySelector<HTMLElement>('[data-count]')
  const clear = root?.querySelector<HTMLElement>('[data-clear]')
  const none = document.querySelector<HTMLElement>('[data-none]')
  const moreRow = document.querySelector<HTMLElement>('[data-reveal-controls]')
  const moreBtn = document.querySelector<HTMLElement>('[data-reveal-more]')
  const allBtn = document.querySelector<HTMLElement>('[data-reveal-all]')
  const progress = document.querySelector<HTMLElement>('[data-reveal-progress]')

  // Tag filtering only exists with JS, so the row stays hidden until now.
  if (tagRow) tagRow.hidden = false

  const pageSize = Number(stream.dataset.pageSize) || entries.length
  /** How many matching entries are revealed. */
  let limit = pageSize
  /** How many entries pass the filters, as of the last `apply`. */
  let matching = entries.length
  let active: Filters = readFilters(location.search)

  /** Replaces the history entry while chips toggle, so Back leaves the page instead of replaying them. */
  function writeUrl(push: boolean) {
    const url = filtersUrl(location.pathname, active, location.hash)
    if (push) history.pushState(null, '', url)
    else history.replaceState(null, '', url)
  }

  function apply() {
    const placed = place(entryFacets, active, limit)
    matching = placed.matching
    entries.forEach((el, i) => {
      const { hidden, beyond } = placed.placements[i] as { hidden: boolean; beyond: boolean }
      el.hidden = hidden
      el.classList.toggle('beyond', beyond)
    })
    for (const chip of repoChips) {
      chip.setAttribute('aria-pressed', String(active.repo.has(chip.dataset.repo ?? '')))
    }
    for (const chip of tagChips) {
      chip.setAttribute('aria-pressed', String(active.tag.has(chip.dataset.tag ?? '')))
    }

    const filtered = isFiltered(active)
    if (clear) clear.hidden = !filtered
    if (none) none.hidden = matching > 0
    // The live region: a filter that silently drops most of the page is invisible to a screen reader.
    if (count) count.textContent = countText(matching, entries.length, filtered)
    if (moreRow) moreRow.hidden = placed.shown >= matching
    if (progress) progress.textContent = progressText(placed.shown, matching)
  }

  /** Raise the limit, then focus the first entry that appeared. */
  function reveal(next: number) {
    const first = entries.find((el) => !el.hidden && el.classList.contains('beyond'))
    limit = next
    apply()
    if (!first) return
    // The new batch starts where the button was, so the viewport is already right.
    first.tabIndex = -1
    first.focus({ preventScroll: true })
  }

  function toggle(set: Set<string>, value: string) {
    if (set.has(value)) set.delete(value)
    else set.add(value)
    // A new filter is a new list; a raised limit would leave the next "show more" nothing to reveal.
    limit = pageSize
    writeUrl(false)
    apply()
  }

  /** Shows an entry whatever the filters and batch say: a `#slug` permalink outranks both. */
  function revealTarget(el: HTMLElement) {
    if (el.hidden) {
      active = readFilters('')
      writeUrl(false)
    }
    // Its index among all entries bounds its index among the matching ones.
    limit = Math.max(limit, entries.indexOf(el) + 1)
    apply()
  }

  /** The entry the `#hash` names, if it names one. */
  function hashTarget(): HTMLElement | null {
    const id = decodeURIComponent(location.hash.slice(1))
    if (!id) return null
    const el = document.getElementById(id)
    return el && el.classList.contains('entry') ? el : null
  }

  for (const chip of repoChips) {
    chip.addEventListener('click', (e) => {
      // The href is the pre-rendered repo page, for crawlers and no-JS; with JS, filter in place.
      e.preventDefault()
      toggle(active.repo, chip.dataset.repo ?? '')
    })
  }
  for (const chip of tagChips) {
    chip.addEventListener('click', () => toggle(active.tag, chip.dataset.tag ?? ''))
  }
  clear?.addEventListener('click', () => {
    active = readFilters('')
    limit = pageSize
    writeUrl(true)
    apply()
  })

  moreBtn?.addEventListener('click', () => reveal(nextLimit(limit, pageSize, matching)))
  // Also the way out of find-in-page missing what is batched away.
  allBtn?.addEventListener('click', () => reveal(entries.length))

  window.addEventListener('popstate', () => {
    active = readFilters(location.search)
    limit = pageSize
    apply()
  })

  // The browser scrolled to the hash before this ran; if the target was batched away, reveal then scroll.
  window.addEventListener('hashchange', () => {
    const el = hashTarget()
    if (!el) return
    revealTarget(el)
    el.scrollIntoView()
  })

  apply()

  const landed = hashTarget()
  if (landed) {
    revealTarget(landed)
    // Next frame, after the reveal reflows; `instant` because this is where the reader starts.
    requestAnimationFrame(() => landed.scrollIntoView({ behavior: 'instant' }))
  }
}
