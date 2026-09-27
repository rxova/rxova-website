import { expect, test } from '@playwright/test'

test.use({ colorScheme: 'light' })

const html = (page: import('@playwright/test').Page) => page.locator('html')

test('follows the system until the reader picks, then keeps the pick', async ({ page }) => {
  await page.goto('/')
  await expect(html(page)).not.toHaveAttribute('data-theme')

  await page.locator('#theme-toggle').click()
  await expect(html(page)).toHaveAttribute('data-theme', 'dark')
  expect(await page.evaluate(() => localStorage.getItem('starlight-theme'))).toBe('dark')

  await page.reload()
  await expect(html(page)).toHaveAttribute('data-theme', 'dark')
  await page.goto('/about/')
  await expect(html(page)).toHaveAttribute('data-theme', 'dark')
})

test('labels the button with the theme it switches to', async ({ page }) => {
  await page.goto('/')
  const toggle = page.locator('#theme-toggle')
  await expect(toggle).toHaveAttribute('aria-label', 'Switch to dark theme')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-label', 'Switch to light theme')
})

test('shows a pick made on another page after going back', async ({ page }) => {
  await page.goto('/')
  await page.goto('/about/')
  await page.locator('#theme-toggle').click()
  await page.goBack()
  await expect(html(page)).toHaveAttribute('data-theme', 'dark')
})
