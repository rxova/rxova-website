import { expect, test, type Page } from '@playwright/test'

const visibleEntries = (page: Page) => page.locator('[data-stream] .entry:not([hidden])')

async function firstTag(page: Page): Promise<string> {
  return (await page.locator('[data-tag]').first().getAttribute('data-tag')) as string
}

test('filters by tag, counts the matches and records the filter in the URL', async ({ page }) => {
  await page.goto('/')
  const total = await page.locator('[data-stream] .entry').count()
  const tag = await firstTag(page)
  const tagged = await page.locator(`[data-stream] .entry[data-tags~="${tag}"]`).count()

  await page.locator(`[data-tag="${tag}"]`).click()
  await expect(page).toHaveURL(new RegExp(`\\?tag=${tag}$`))
  await expect(page.locator(`[data-tag="${tag}"]`)).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('[data-count]')).toHaveText(`${tagged} of ${total} entries`)
  await expect(page.locator('[data-stream] .entry[hidden]')).toHaveCount(total - tagged)

  await page.locator('[data-clear]').click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.locator('[data-stream] .entry[hidden]')).toHaveCount(0)
})

test('filters by repo in place instead of following the chip link', async ({ page }) => {
  await page.goto('/')
  const chip = page.locator('[data-repo]').first()
  const repo = (await chip.getAttribute('data-repo')) as string
  await chip.click()
  await expect(page).toHaveURL(new RegExp(`/\\?repo=${repo}$`))
  for (const entry of await visibleEntries(page).all()) {
    await expect(entry).toHaveAttribute('data-repos', new RegExp(`(^| )${repo}( |$)`))
  }
})

test('applies a filter from the URL on load and restores it on Back', async ({ page }) => {
  await page.goto('/')
  const tag = await firstTag(page)
  await page.goto(`/?tag=${tag}`)
  await expect(page.locator(`[data-tag="${tag}"]`)).toHaveAttribute('aria-pressed', 'true')

  await page.locator('[data-clear]').click()
  await expect(page.locator(`[data-tag="${tag}"]`)).toHaveAttribute('aria-pressed', 'false')
  await page.goBack()
  await expect(page.locator(`[data-tag="${tag}"]`)).toHaveAttribute('aria-pressed', 'true')
})

test('reveals the stream a batch at a time', async ({ page }) => {
  await page.goto('/')
  const pageSize = Number(await page.locator('[data-stream]').getAttribute('data-page-size'))
  const total = await page.locator('[data-stream] .entry').count()
  test.skip(total <= pageSize, 'fewer entries than one batch')

  const shown = page.locator('[data-stream] .entry:not([hidden]):not(.beyond)')
  await expect(shown).toHaveCount(pageSize)
  await page.locator('[data-more]').click()
  await expect(shown).toHaveCount(Math.min(total, pageSize * 2))
  await page.locator('[data-more-all]').click()
  await expect(shown).toHaveCount(total)
  await expect(page.locator('[data-more-row]')).toBeHidden()
})
