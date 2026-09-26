import { expect, test } from '@playwright/test'

test('lists every post and opens one', async ({ page }) => {
  await page.goto('/')
  const links = page.locator('.posts .post a.title')
  expect(await links.count()).toBeGreaterThan(0)

  const title = (await links.first().textContent())?.trim() ?? ''
  await links.first().click()
  await expect(page.locator('main h1')).toHaveText(title.replace(/\s*Draft$/, ''))
})

test('hides "Show more" when every post already fits', async ({ page }) => {
  await page.goto('/')
  const posts = await page.locator('.posts .post').count()
  const size = Number(await page.locator('[data-reveal-list]').getAttribute('data-reveal-step'))
  test.skip(!size || posts > size, 'more posts than one batch')
  await expect(page.locator('[data-reveal-controls]')).toBeHidden()
})
