/** The shared Vitest setup: each package's config names only its files and its coverage floor. */
import { defineConfig } from 'vitest/config'
import type { CoverageOptions } from 'vitest/node'

export interface UnitOptions {
  /** Test files. */
  include?: string[]
  /** Source files counted for coverage. */
  coverage?: string[]
  /** Source files left out of coverage, beyond the tests themselves. */
  exclude?: string[]
  /** Coverage floors; omitted means coverage is reported, not enforced. */
  thresholds?: CoverageOptions['thresholds']
  testTimeout?: number
}

export function unitConfig({
  include = ['src/**/*.test.ts'],
  coverage = ['src/**/*.ts'],
  exclude = [],
  thresholds,
  testTimeout,
}: UnitOptions = {}) {
  return defineConfig({
    test: {
      include,
      environment: 'node',
      ...(testTimeout ? { testTimeout } : {}),
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json-summary'],
        include: coverage,
        exclude: ['**/*.test.*', ...exclude],
        ...(thresholds ? { thresholds } : {}),
      },
    },
  })
}
