/** What only exists once the site is assembled: surfaces from other builds inside one shell. */
import { expect, test } from '@playwright/test'

const SECTIONS = [
  { path: '/', nav: '/' },
  { path: '/about/', nav: '/about' },
  { path: '/blog/', nav: '/blog' },
  { path: '/updates/', nav: '/updates' },
]

for (const { path, nav } of SECTIONS) {
  test(`${path} sits in the site shell and marks its own section`, async ({ page }) => {
    await page.goto(path)
    await expect(page.locator('header.site')).toBeVisible()
    await expect(page.locator('footer.rx-footer')).toBeVisible()
    await expect(page.locator(`header.site nav a[href="${nav}"]`)).toHaveAttribute(
      'aria-current',
      'page',
    )
    await expect(page.locator('header.site nav a[aria-current="page"]')).toHaveCount(1)
  })
}

test('moves between sections through the header', async ({ page }) => {
  await page.goto('/')
  await page.locator('header.site nav a[href="/blog"]').click()
  await expect(page).toHaveURL(/\/blog\/?$/)
  await page.locator('header.site nav a[href="/updates"]').click()
  await expect(page).toHaveURL(/\/updates\/?$/)
  await page.locator('header.site a.brand').click()
  await expect(page).toHaveURL(/\/$/)
})

test.describe('theme', () => {
  test.use({ colorScheme: 'light' })

  test('a pick on the landing carries into the blog and updates', async ({ page }) => {
    await page.goto('/')
    await page.locator('#theme-toggle').click()
    for (const path of ['/blog/', '/updates/']) {
      await page.goto(path)
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    }
  })
})
