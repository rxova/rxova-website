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
  // The walkthrough's window is the frame; the code block inside it draws none
  // of its own — no border, no radius, no second background.
  styleOverrides: {
    borderRadius: '0',
    borderColor: 'transparent',
    borderWidth: '0',
    // The window's own background, @rxova/brand's --rx-bg, as a real colour
    // rather than `transparent`: Expressive Code adjusts token colours for
    // contrast against it, and against `transparent` it dimmed the text on
    // highlighted lines in the dark theme. Keep these two in step with
    // packages/brand/src/tokens.css.
    codeBackground: ({ theme }) => (theme.type === 'dark' ? '#0b0a08' : '#ffffff'),
    codeFontFamily: 'var(--rx-font-mono)',
    codeFontSize: '0.8rem',
    uiFontFamily: 'inherit',
    frames: { shadowColor: 'transparent' },
    // The note in play is marked by a tint, its accent and its number, not a
    // block of colour: a light wash in each theme, strong only at the edge.
    textMarkers: {
      delBackground: ({ theme }) =>
        theme.type === 'dark' ? 'rgba(244, 63, 94, 0.14)' : 'rgba(225, 29, 72, 0.08)',
      delBorderColor: ({ theme }) =>
        theme.type === 'dark' ? 'rgba(251, 113, 133, 0.75)' : 'rgba(225, 29, 72, 0.6)',
      insBackground: ({ theme }) =>
        theme.type === 'dark' ? 'rgba(34, 197, 94, 0.13)' : 'rgba(22, 163, 74, 0.09)',
      insBorderColor: ({ theme }) =>
        theme.type === 'dark' ? 'rgba(74, 222, 128, 0.7)' : 'rgba(22, 163, 74, 0.6)',
    },
  },
  defaultProps: { wrap: true, frame: 'none' },
})
