import { unitConfig } from '@rxova/repo-tooling/vitest'

export default unitConfig({
  include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
  coverage: ['src/**/*.ts', 'scripts/**/*.ts'],
})
