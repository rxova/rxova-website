import { getViteConfig } from 'astro/config'
import { unitConfig } from '@rxova/repo-tooling/vitest'

// Tests live in test/, which the tarball's `files` leaves out. getViteConfig compiles `.astro` for the container API.
export default getViteConfig(
  unitConfig({
    include: ['test/**/*.test.ts'],
    coverage: ['src/**/*.ts'],
    thresholds: { perFile: true, statements: 95, branches: 95, functions: 95, lines: 95 },
  }),
)
