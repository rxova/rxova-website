import { defineConfig } from 'astro/config'

/**
 * This package publishes components, not a site — but `tsc` cannot parse
 * `.astro`, so without an Astro project here the shared chrome would ship
 * entirely unchecked. This config exists purely so `astro check` can run over
 * `src/components/`. Nothing is ever built from it.
 */
export default defineConfig({
  site: 'https://rxova.org',
})
