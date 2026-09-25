/// <reference types="astro/client" />

// Deliberately NOT referencing `@astrojs/starlight/locals` for the
// `Astro.locals.starlightRoute` augmentation: that declaration pulls in
// Starlight's own `.ts` sources, which import `virtual:starlight/*` modules
// that only exist inside an Astro build — so plain `tsc` fails on them.
// The one component that reads route data narrows it structurally instead.

// Same reasoning for this one. It mirrors Starlight's own `global.d.ts`, which
// we cannot `/// <reference>` because the package's types entry is `index.ts`
// and drags in those same virtual modules. The global is defined at runtime by
// the inline script in Starlight's `ThemeProvider.astro`; ThemeSelect.astro
// calls it. Re-check this against Starlight's `global.d.ts` on a major bump.
declare global {
  interface StarlightThemeProvider {
    updatePickers(theme?: string): void
  }
  var StarlightThemeProvider: StarlightThemeProvider
}

export {}
