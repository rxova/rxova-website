// @ts-check
import { defineEcConfig } from 'astro-expressive-code'

/**
 * The code in each project's walkthrough on the landing. The same engine the
 * docs sites use through Starlight, with the same Night Owl pair, so a snippet
 * reads the same on the landing as in the docs it links to.
 *
 * In its own file rather than astro.config.mjs because the `<Code>` component
 * loads it as a module, and `themeCssSelector` is a function.
 */
export default defineEcConfig({
  themes: ['night-owl', 'night-owl-light'],
  // @rxova/brand's theme script sets `data-theme` on <html> only when the
  // reader has picked one; with none set, the OS preference decides.
  themeCssSelector: (theme) => `[data-theme='${theme.type}']`,
  useDarkModeMediaQuery: true,
  styleOverrides: {
    borderRadius: 'var(--rx-radius-sm)',
    borderColor: 'var(--rx-rule)',
    codeBackground: 'var(--rx-card)',
    codeFontFamily: 'var(--rx-font-mono)',
    codeFontSize: '0.8rem',
    uiFontFamily: 'inherit',
    frames: { shadowColor: 'transparent' },
  },
  defaultProps: { wrap: true, frame: 'none' },
})
