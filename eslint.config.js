import { defineConfig, globalIgnores } from 'eslint/config'
import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import astro from 'eslint-plugin-astro'

export default defineConfig(
  globalIgnores(['**/node_modules/', '**/dist/', '_site/', '**/.astro/', 'artifacts/', 'build/']),
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
    // Node ESM tooling (the site assembler).
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: globals.node },
  },
)
