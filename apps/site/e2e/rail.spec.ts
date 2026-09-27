import { expect, test } from '@playwright/test'

const tab = (id: string) => `.rail-item[data-rail="${id}"]`
const panel = (id: string) => `#project-${id}`

test.describe('project rail', () => {
  test('is a tablist that opens on the featured project', async ({ page }) => {
    await page.goto('/projects/')
    await expect(page.locator('#project-rail')).toHaveAttribute('role', 'tablist')
    await expect(page.locator(tab('ts-extended-errors'))).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator(panel('ts-extended-errors'))).toHaveClass(/is-active/)
    await expect(page.locator(panel('journey'))).toHaveAttribute('aria-hidden', 'true')
  })

  test('moves with the arrow keys, Home and End, wrapping at the ends', async ({ page }) => {
    await page.goto('/projects/')
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
    await page.goto('/projects/')
    await page.locator(tab('journey')).click()
    await expect(page.locator(panel('journey'))).toHaveClass(/is-active/)
    await expect(page.locator('.rail-item[tabindex="0"]')).toHaveCount(1)
    await expect(page.locator(tab('journey'))).toHaveAttribute('tabindex', '0')
  })

  test('honours a deep link to a project', async ({ page }) => {
    await page.goto('/projects/#project-journey')
    await expect(page.locator(tab('journey'))).toHaveAttribute('aria-selected', 'true')
  })

  test('renders only the featured walkthrough, and fetches another on selection', async ({
    page,
  }) => {
    // Hold the idle fill back, so the fetch below is the one selection makes.
    await page.addInitScript(() => {
      window.requestIdleCallback = () => 0
    })
    await page.goto('/projects/')
    await expect(page.locator('[data-walkthrough]')).toHaveCount(1)
    await expect(page.locator(`${panel('journey')} [data-walkthrough-src]`)).toHaveCount(1)

    const fetched = page.waitForResponse((r) => r.url().endsWith('/walkthroughs/journey/'))
    await page.locator(tab('journey')).click()
    await fetched
    const tour = page.locator(`${panel('journey')} [data-walkthrough]`)
    await expect(tour).toHaveAttribute('data-js', '')
    // A tour plays while it is on screen, as the inline one does.
    await tour.scrollIntoViewIfNeeded()
    await expect(tour.locator('[data-play]')).toHaveAttribute('data-state', 'playing')
    await expect(page.locator(`${panel('journey')} [data-walkthrough-src]`)).toHaveCount(0)
  })

  test('fills every other walkthrough once the page is idle', async ({ page }) => {
    await page.goto('/projects/')
    await expect(page.locator('[data-walkthrough-src]')).toHaveCount(0)
    await expect(page.locator('[data-walkthrough][data-js]')).toHaveCount(4)
    // On screen, only the visible panel's tour plays; the filled, hidden ones stay paused.
    await page.locator(`${panel('ts-extended-errors')} [data-walkthrough]`).scrollIntoViewIfNeeded()
    await expect(page.locator(`${panel('ts-extended-errors')} [data-play]`)).toHaveAttribute(
      'data-state',
      'playing',
    )
    await expect(page.locator('[data-play][data-state="playing"]')).toHaveCount(1)
  })
})

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('shows every project and keeps the rail as in-page links', async ({ page }) => {
    await page.goto('/projects/')
    await expect(page.locator('#project-rail')).not.toHaveAttribute('role', 'tablist')
    await expect(page.locator(tab('journey'))).toHaveAttribute('href', '#project-journey')
    for (const id of ['journey', 'react-inputs', 'use-everywhere', 'ts-extended-errors']) {
      await expect(page.locator(panel(id))).toBeVisible()
    }
  })

  test('links each deferred walkthrough to its own page, which shows it in full', async ({
    page,
  }) => {
    await page.goto('/projects/')
    await page.locator(`${panel('journey')} .walkthrough-slot a`).click()
    await expect(page).toHaveURL(/\/walkthroughs\/journey\/$/)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex')
    await expect(page.locator('[data-walkthrough] [data-pane="before"]')).toBeVisible()
    await expect(page.locator('[data-walkthrough] [data-pane="after"]')).toBeVisible()
  })
})
