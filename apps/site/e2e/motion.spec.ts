import { expect, test, type Page } from '@playwright/test'

const sweep = (page: Page) =>
  page
    .locator('nav.links a:not(.btn)')
    .first()
    .evaluate((a) => getComputedStyle(a).transitionDuration)

test('link underlines sweep in on hover', async ({ page }) => {
  await page.goto('/projects/')
  expect(await sweep(page)).toBe('0.25s')
})

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })

  test('link underlines do not animate', async ({ page }) => {
    await page.goto('/projects/')
    expect(await sweep(page)).toBe('0s')
  })
})
