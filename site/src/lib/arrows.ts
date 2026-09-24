/**
 * The arrow after a link's label: `across` for a page on this site, `out` for
 * one that opens elsewhere.
 *
 * Drawn rather than typed. The `→` and `↗` characters came from the text font
 * at 0.85em, so they rendered at two different widths, sat a size below the
 * label and shrank or grew with whichever font the glyph fell back to. Stroked
 * paths on one 16-unit grid, sized in `em`, keep both the same weight as each
 * other and as the label beside them.
 */
export const ARROWS = {
  across: '<path d="M3 8h10M9 4l4 4-4 4" />',
  out: '<path d="M4.5 11.5l7-7M5.5 4.5h6v6" />',
} as const
