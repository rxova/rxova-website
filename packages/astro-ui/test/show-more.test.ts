// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'

import { enhanceShowMore } from '../src/scripts/show-more.ts'

/** A list of `count` items batched `step` at a time, with ShowMore's controls after it. */
function page(count: number, step: number | '' = 2): void {
  const items = Array.from({ length: count }, (_, i) => `<li>${i}</li>`).join('')
  document.body.innerHTML = `
    <ul data-reveal-list data-reveal-step="${step}">${items}</ul>
    <div data-reveal-controls hidden>
      <button data-reveal-more></button>
      <button data-reveal-all></button>
      <p data-reveal-progress></p>
    </div>`
}

const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector) as T
const visible = () =>
  Array.from($('[data-reveal-list]').children).filter((el) => !(el as HTMLElement).hidden).length

describe('enhanceShowMore', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('shows the first batch and reports progress', () => {
    page(5)
    enhanceShowMore()
    expect(visible()).toBe(2)
    expect($('[data-reveal-controls]').hidden).toBe(false)
    expect($('[data-reveal-progress]').textContent).toBe('Showing 2 of 5')
  })

  it('reveals one batch per click and focuses its first item', () => {
    page(5)
    enhanceShowMore()
    $('[data-reveal-more]').click()
    expect(visible()).toBe(4)
    const third = $('[data-reveal-list]').children[2] as HTMLElement
    expect(document.activeElement).toBe(third)
    expect(third.tabIndex).toBe(-1)
    $('[data-reveal-more]').click()
    expect(visible()).toBe(5)
    expect($('[data-reveal-controls]').hidden).toBe(true)
    expect($('[data-reveal-progress]').textContent).toBe('')
  })

  it('reveals everything at once with "Show all"', () => {
    page(5)
    enhanceShowMore()
    $('[data-reveal-all]').click()
    expect(visible()).toBe(5)
    expect($('[data-reveal-controls]').hidden).toBe(true)
  })

  it('focuses nothing when a click has nothing left to reveal', () => {
    page(2)
    enhanceShowMore()
    $('[data-reveal-all]').click()
    expect(document.activeElement).toBe(document.body)
  })

  it('keeps the controls hidden when every item fits', () => {
    page(2)
    enhanceShowMore()
    expect(visible()).toBe(2)
    expect($('[data-reveal-controls]').hidden).toBe(true)
  })

  it('shows everything when the list names no step', () => {
    page(3, '')
    enhanceShowMore()
    expect(visible()).toBe(3)
  })

  it('does nothing without a list, so a page can drive the controls itself', () => {
    document.body.innerHTML = '<div data-reveal-controls hidden></div>'
    enhanceShowMore()
    expect($('[data-reveal-controls]').hidden).toBe(true)
  })

  it('tolerates controls missing their buttons', () => {
    document.body.innerHTML =
      '<ul data-reveal-list data-reveal-step="1"><li></li><li></li></ul><div data-reveal-controls hidden></div>'
    enhanceShowMore()
    expect(visible()).toBe(1)
    expect($('[data-reveal-controls]').hidden).toBe(false)
  })
})
