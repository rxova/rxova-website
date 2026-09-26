import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  // Dual ESM + CJS, compiled: plain Node scripts import this, and Node won't strip types
  // inside node_modules.
  format: ['esm', 'cjs'],
  // tsdown 0.16+ would write index.mjs / index.d.mts; `exports` points at index.js / index.d.ts.
  fixedExtension: false,
  dts: true,
  clean: true,
  treeshake: true,
  // zod is a peer dependency: bundling it would ship a second copy and break
  // `instanceof` for consumers extending these schemas with their own.
  deps: { neverBundle: ['zod'] },
})
