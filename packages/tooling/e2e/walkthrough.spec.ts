import { expect, test, type Page } from '@playwright/test'

const root = '#project-ts-extended-errors [data-walkthrough]'

async function open(page: Page) {
  await page.goto('/')
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

test('scrolls its code, never the page', async ({ page }) => {
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

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('shows both sides in full with every note listed', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator(`${root} .pane.before`)).toBeVisible()
    await expect(page.locator(`${root} .pane.after`)).toBeVisible()
    await expect(page.locator(`${root} .pane.before [data-note]`)).toHaveCount(4)
    await expect(page.locator(`${root} [data-bar]`)).toBeHidden()
  })
})
