import { expect, test } from '@playwright/test'

const tab = (id: string) => `.rail-item[data-rail="${id}"]`
const panel = (id: string) => `#project-${id}`

test.describe('project rail', () => {
  test('is a tablist that opens on the featured project', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('#project-rail')).toHaveAttribute('role', 'tablist')
    await expect(page.locator(tab('ts-extended-errors'))).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator(panel('ts-extended-errors'))).toHaveClass(/is-active/)
    await expect(page.locator(panel('journey'))).toHaveAttribute('aria-hidden', 'true')
  })

  test('moves with the arrow keys, Home and End, wrapping at the ends', async ({ page }) => {
    await page.goto('/')
    const tabs = page.locator('.rail-item')
    const ids = await tabs.evaluateAll((els) => els.map((el) => el.getAttribute('data-rail')))
    const first = ids[0] as string
    const last = ids.at(-1) as string

    await page.locator(tab('ts-extended-errors')).focus()
    await page.keyboard.press('Home')
    await expect(page.locator(tab(first))).toBeFocused()
    await expect(page.locator(tab(first))).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator(panel(first))).toHaveClass(/is-active/)

    await page.keyboard.press('ArrowUp')
    await expect(page.locator(tab(last))).toHaveAttribute('aria-selected', 'true')
    await page.keyboard.press('ArrowDown')
    await expect(page.locator(tab(first))).toHaveAttribute('aria-selected', 'true')
    await page.keyboard.press('End')
    await expect(page.locator(tab(last))).toBeFocused()
  })

  test('selects on click and keeps a single tab stop', async ({ page }) => {
    await page.goto('/')
    await page.locator(tab('journey')).click()
    await expect(page.locator(panel('journey'))).toHaveClass(/is-active/)
    await expect(page.locator('.rail-item[tabindex="0"]')).toHaveCount(1)
    await expect(page.locator(tab('journey'))).toHaveAttribute('tabindex', '0')
  })

  test('honours a deep link to a project', async ({ page }) => {
    await page.goto('/#project-journey')
    await expect(page.locator(tab('journey'))).toHaveAttribute('aria-selected', 'true')
  })
})

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('shows every project and keeps the rail as in-page links', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('#project-rail')).not.toHaveAttribute('role', 'tablist')
    await expect(page.locator(tab('journey'))).toHaveAttribute('href', '#project-journey')
    for (const id of ['journey', 'react-inputs', 'use-everywhere', 'ts-extended-errors']) {
      await expect(page.locator(panel(id))).toBeVisible()
    }
  })
})
