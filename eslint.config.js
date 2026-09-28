import { rxova } from '@rxova/repo-config/eslint'

export default rxova({
  tsconfigRootDir: import.meta.dirname,
  astro: true,
  node: true,
  tests: true,
  ignores: [
    '_site/',
    'artifacts/',
    'build/',
    '.lock/',
    // The walkthroughs' code is displayed exactly as written, like .prettierignore says.
    'apps/site/src/showcases/*/after.*',
    'apps/site/src/showcases/*/before.*',
  ],
  consoleAllowed: ['scripts/**', '**/scripts/**'],
})
