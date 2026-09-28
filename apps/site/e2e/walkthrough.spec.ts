import { expect, test, type Page } from '@playwright/test'

const root = '#project-ts-extended-errors [data-walkthrough]'

async function open(page: Page) {
  await page.goto('/projects/')
  await page.locator(root).scrollIntoViewIfNeeded()
  return {
    count: page.locator(`${root} [data-count]`),
    play: page.locator(`${root} [data-play]`),
    prev: page.locator(`${root} [data-prev]`),
    next: page.locator(`${root} [data-next]`),
    caption: page.locator(`${root} [data-caption]`),
  }
}

test('plays once it is on screen and steps under the reader’s control', async ({ page }) => {
  const { count, play, prev, next } = await open(page)
  await expect(play).toHaveAttribute('data-state', 'playing')
  await expect(count).toHaveText('Problem 1 of 4')
  await expect(prev).toBeDisabled()

  await next.click()
  await expect(count).toHaveText('Problem 2 of 4')
  await expect(play).toHaveAttribute('data-state', 'paused')

  await prev.click()
  await expect(count).toHaveText('Problem 1 of 4')
})

test('switches to the after side and back', async ({ page }) => {
  const { count, caption } = await open(page)
  await page.locator(`${root} [data-show="after"]`).click()
  await expect(count).toHaveText('Fix 1 of 4')
  await expect(page.locator(root)).toHaveAttribute('data-show', 'after')
  await expect(caption).toHaveAttribute('data-side', 'after')

  await page.locator(`${root} [data-show="before"]`).click()
  await expect(count).toHaveText('Problem 1 of 4')
})

test('steps through the notes without moving the page', async ({ page }) => {
  const { next } = await open(page)
  const before = await page.evaluate(() => window.scrollY)
  for (let step = 0; step < 3; step++) await next.click()
  expect(await page.evaluate(() => window.scrollY)).toBe(before)
})

test('pauses when another project is selected', async ({ page }) => {
  const { play } = await open(page)
  await expect(play).toHaveAttribute('data-state', 'playing')
  await page.locator('.rail-item[data-rail="journey"]').click()
  await expect(play).toHaveAttribute('data-state', 'paused')
})

test('goes full screen and back, keeping its place', async ({ page }) => {
  const { count, next } = await open(page)
  const expand = page.locator(`${root} [data-expand]`)
  await next.click()
  await expect(count).toHaveText('Problem 2 of 4')

  await expand.click()
  await expect(page.locator(root)).toHaveAttribute('data-expanded', '')
  await expect(expand).toHaveAttribute('aria-pressed', 'true')
  const box = await page.locator(root).boundingBox()
  const viewport = page.viewportSize()
  expect(box?.height).toBe(viewport?.height)
  await expect(count).toHaveText('Problem 2 of 4')

  await page.keyboard.press('ArrowRight')
  await expect(count).toHaveText('Problem 3 of 4')

  await expand.click()
  await expect(page.locator(root)).not.toHaveAttribute('data-expanded')
  await expect(expand).toHaveAttribute('aria-pressed', 'false')
  await expect(count).toHaveText('Problem 3 of 4')
})

test('falls back to an overlay where the browser has no element full screen', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Document.prototype, 'fullscreenEnabled', { get: () => false })
  })
  await open(page)
  await page.locator(`${root} [data-expand]`).click()
  await expect(page.locator(root)).toHaveAttribute('data-expanded', '')
  await expect(page.locator('html')).toHaveClass(/walkthrough-locked/)

  await page.keyboard.press('Escape')
  await expect(page.locator(root)).not.toHaveAttribute('data-expanded')
  await expect(page.locator('html')).not.toHaveClass(/walkthrough-locked/)
})

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })

  test('waits for the reader instead of playing', async ({ page }) => {
    const { count, play, next } = await open(page)
    await page.waitForTimeout(1_500)
    await expect(play).toHaveAttribute('data-state', 'paused')
    await expect(count).toHaveText('Problem 1 of 4')
    await next.click()
    await expect(count).toHaveText('Problem 2 of 4')
  })
})

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 664 } })

  test('expands into a full-page modal: just the window, edge to edge', async ({ page }) => {
    await open(page)
    await page.locator(`${root} [data-expand]`).click()
    await expect(page.locator(root)).toHaveAttribute('data-expanded', '')
    await expect(page.locator(`${root} .heading`)).toBeHidden()
    await expect(page.locator(`${root} .lede`)).toBeHidden()
    // Edge to edge: the window is as wide as the expanded walkthrough, with no padding or border between.
    const window = await page.locator(`${root} .window`).boundingBox()
    const frame = await page.locator(root).boundingBox()
    expect(window?.width).toBe(frame?.width)
    expect(window?.x).toBe(frame?.x)
    await page.locator(`${root} [data-expand]`).click()
    await expect(page.locator(`${root} .heading`)).toBeVisible()
  })
})

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('shows both sides in full with every note listed', async ({ page }) => {
    await page.goto('/projects/')
    await expect(page.locator(`${root} .pane.before`)).toBeVisible()
    await expect(page.locator(`${root} .pane.after`)).toBeVisible()
    await expect(page.locator(`${root} .pane.before [data-note]`)).toHaveCount(4)
    await expect(page.locator(`${root} [data-bar]`)).toBeHidden()
  })
})
