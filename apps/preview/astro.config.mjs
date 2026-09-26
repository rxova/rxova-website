import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'
import { RXOVA_ORIGIN } from '@rxova/brand'
import { sharedStarlightConfig } from '@rxova/astro-ui/starlight'

/**
 * The preview site, built like a real docs site via `sharedStarlightConfig()` so CI tests
 * the shared config's real code path on every PR. Never deployed; `site` makes URLs resolve.
 */
export default defineConfig({
  site: RXOVA_ORIGIN,
  integrations: [
    starlight(
      sharedStarlightConfig({
        // A real project id: the shared config resolves the title, social links
        // and OG image from it, so a fake id would preview chrome no site renders.
        project: 'journey',
        editLinkBase: 'apps/preview',
        sidebar: [
          { label: 'Preview', items: [{ autogenerate: { directory: 'preview' } }] },
          {
            label: 'Other surfaces',
            items: [{ label: 'Plain Astro page', link: '/plain/' }],
          },
        ],
      }),
    ),
  ],
})
