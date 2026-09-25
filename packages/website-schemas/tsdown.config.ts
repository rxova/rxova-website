import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  // Dual ESM + CJS, matching the sibling packages. It matters more here than
  // usual: this package is imported by rxova-website's plain Node scripts
  // (check-registry, ingest), not only by bundlers — shipping raw TypeScript is
  // what made 0.1.0 unusable there, since Node refuses to strip types inside
  // node_modules.
  format: ['esm', 'cjs'],
  // tsdown 0.16+ defaults this to true on the node platform and writes
  // index.mjs / index.d.mts. `exports` points at index.js / index.d.ts (the
  // package is `type: module`), so keep the plain extensions.
  fixedExtension: false,
  dts: true,
  clean: true,
  treeshake: true,
  // zod is a peer dependency: bundling it would ship a second copy and break
  // `instanceof` for consumers extending these schemas with their own.
  deps: { neverBundle: ['zod'] },
})
