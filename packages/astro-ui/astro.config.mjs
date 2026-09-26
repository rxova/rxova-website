import { defineConfig } from 'astro/config'

// Only here so `astro check` can typecheck the components; nothing is built from it.
export default defineConfig({
  site: 'https://rxova.org',
})
