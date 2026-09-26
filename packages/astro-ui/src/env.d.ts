/// <reference types="astro/client" />

// Not referencing `@astrojs/starlight/locals`: it imports `virtual:starlight/*` modules that
// only exist in an Astro build, so plain `tsc` fails. Route data is narrowed structurally instead.

// Mirrors Starlight's `global.d.ts`: set by its `ThemeProvider.astro`, called by ThemeSelect.astro.
// Re-check against Starlight's `global.d.ts` on a major bump.
declare global {
  interface StarlightThemeProvider {
    updatePickers(theme?: string): void
  }
  var StarlightThemeProvider: StarlightThemeProvider
}

export {}
