import { defineConfig, globalIgnores } from 'eslint/config'
import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import astro from 'eslint-plugin-astro'

export default defineConfig(
  globalIgnores([
    '**/node_modules/',
    '**/dist/',
    '**/.astro/',
    '**/.turbo/',
    '_site/',
    'artifacts/',
    'build/',
    'coverage/',
    '.lock/',
  ]),
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx,mjs,js}'],
    extends: [tseslint.configs.recommended],
  },
  // Astro components (frontmatter + template) and their inline browser scripts.
  ...astro.configs.recommended,
  {
    files: ['**/*.astro'],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    // Node tooling: the aggregator and repo scripts at the root, and the ones one
    // workspace level down (packages/brand/scripts). sites.ts reads process.env
    // for the origin override, so package sources get Node globals too.
    files: ['**/src/**/*.{ts,mjs}', '**/scripts/**/*.{ts,mjs}'],
    languageOptions: { globals: globals.node },
  },
  {
    // Astro config files run under Node, and read process.env for the base URL the
    // aggregator will mount each surface at.
    files: ['**/*.config.mjs'],
    languageOptions: { globals: globals.node },
  },
)
