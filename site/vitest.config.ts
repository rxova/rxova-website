import { unitConfig } from '@rxova/repo-tooling/vitest'

// journey's walkthrough waits out a real 5s step timeout.
export default unitConfig({ testTimeout: 15_000 })
