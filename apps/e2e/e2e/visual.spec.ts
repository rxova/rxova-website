/** Local only (`pnpm visual`): screenshots of the main routes, compared against a baseline in .lock/visual. */
import { expect, test } from '@playwright/test'

const ROUTES = ['/', '/projects/', '/privacy/', '/blog/', '/updates/']
const WIDTHS = [375, 768, 1280]
const SCHEMES = ['light', 'dark'] as const

for (const scheme of SCHEMES) {
  test.describe(scheme, () => {
    test.use({ colorScheme: scheme, reducedMotion: 'reduce' })

    for (const width of WIDTHS) {
      for (const route of ROUTES) {
        test(`${route} at ${width}px`, async ({ page }) => {
          await page.setViewportSize({ width, height: 900 })
          await page.goto(route)
          // Lazy images below the fold (the footer's mark) load on their own schedule: load and decode them first.
          await page.evaluate(async () => {
            for (const img of document.images) img.loading = 'eager'
            await Promise.all(
              [...document.images].map((img) => img.decode().catch(() => undefined)),
            )
          })
          await page.evaluate(() => document.fonts.ready)
          const name = `${route.replaceAll('/', '_') || '_'}-${width}-${scheme}.png`
          await expect(page).toHaveScreenshot(name, { fullPage: true, animations: 'disabled' })
        })
      }
    }
  })
}
