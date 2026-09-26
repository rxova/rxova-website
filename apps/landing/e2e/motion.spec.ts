import { expect, test } from '@playwright/test'

const sweep = (page: import('@playwright/test').Page) =>
  page
    .locator('nav.links a:not(.btn)')
    .first()
    .evaluate((a) => getComputedStyle(a).transitionDuration)

test('link underlines sweep in on hover', async ({ page }) => {
  await page.goto('/')
  expect(await sweep(page)).toBe('0.25s')
})

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })

  test('link underlines do not animate', async ({ page }) => {
    await page.goto('/')
    expect(await sweep(page)).toBe('0s')
  })
})
