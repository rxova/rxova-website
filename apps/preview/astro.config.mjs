import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'
import { sharedStarlightConfig } from '@rxova/brand'

/**
 * The preview site.
 *
 * This is deliberately built the way a real docs site is built — spread
 * `sharedStarlightConfig()`, add a sidebar — rather than wiring the stylesheets
 * up by hand. That makes it a test of the thing consumers actually use: the
 * shared config, the three component overrides, the customCss ordering and both
 * entry-point stylesheets all go through their real code path here, and CI
 * builds it on every PR.
 *
 * It exists because there was previously nowhere in this repo to *look* at the
 * theme. The font flash fixed in #2 was found on the live site for exactly that
 * reason.
 *
 * `site` is the production origin so canonical URLs and the OG tags in the
 * shared config resolve to something real. Nothing here is ever deployed.
 */
export default defineConfig({
  site: 'https://rxova.org',
  integrations: [
    starlight(
      sharedStarlightConfig({
        // A real project id, not a synthetic "preview" one: the shared config
        // resolves the title, tagline, social links and OG image from it, so a
        // fake id would preview chrome no site ever renders. `journey` is the
        // surface the typography originally came from.
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
