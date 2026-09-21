/**
 * The "Rxova" wordmark as one SVG path, in IBM Plex Mono Medium.
 *
 * Committed rather than generated at build time, and generated rather than
 * hand-drawn. The landing renders it twice from this single source: outlined,
 * as an inline `<svg>`, and extruded into a wireframe by three.js — so the 3D
 * version and its fallback can never disagree about the shape of the letters,
 * and a brand typeface survives into the 3D rendering instead of being swapped
 * for whichever font ships with a 3D text helper.
 *
 * The mono face rather than the sans: every glyph then carries the same
 * advance, so the word is evenly spaced by construction, and it is the same
 * voice the page already uses for its labels and code.
 *
 * Normalised so the word is exactly 1000 units wide. Nothing downstream should
 * assume a height; use `WORDMARK_VIEWBOX`.
 *
 * ## Regenerating
 *
 * Only needed if the wordmark's text or typeface changes. Requires Python with
 * `fonttools` and `brotli` (`pip install fonttools brotli`), and the woff2 that
 * @fontsource already installs:
 *
 * ```py
 * from fontTools.ttLib import TTFont
 * from fontTools.pens.svgPathPen import SVGPathPen
 * from fontTools.pens.transformPen import TransformPen
 * from fontTools.misc.transform import Transform
 *
 * f = TTFont('.../@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2')
 * gs, cmap, hmtx = f.getGlyphSet(), f.getBestCmap(), f['hmtx']
 * names = [cmap[ord(c)] for c in 'Rxova']
 * advances = [hmtx[n][0] for n in names]
 * scale, x, parts = 1000 / sum(advances), 0.0, []
 * for name, adv in zip(names, advances):
 *     pen = SVGPathPen(gs, ntos=lambda v: f'{v:.1f}')
 *     # -scale on Y converts the font's y-up outlines to SVG's y-down space.
 *     gs[name].draw(TransformPen(pen, Transform(scale, 0, 0, -scale, x * scale, 0)))
 *     parts.append(pen.getCommands())
 *     x += adv
 * print(' '.join(parts))
 * ```
 *
 * Kerning is deliberately not applied, and in a monospaced face there is none
 * to apply — the advances are already identical.
 */
export const WORDMARK_PATH =
  'M65.0 0.0H28.0V-232.7H115.0Q148.3 -232.7 165.8 -214.0Q183.3 -195.3 183.3 -162.7Q183.3 -136.0 170.3 -118.7Q157.3 -101.3 133.0 -97.3L186.7 0.0H145.3L96.0 -94.0H65.0ZM109.7 -124.0Q144.3 -124.0 144.3 -155.7V-170.0Q144.3 -201.7 109.7 -201.7H65.0V-124.0Z M215.0 0.0 279.0 -87.3 217.7 -172.0H260.0L282.7 -139.3L300.7 -113.3H302.7L320.3 -139.3L343.0 -172.0H382.3L320.7 -88.7L385.3 0.0H342.7L317.0 -37.0L299.3 -62.3H297.3L280.0 -37.0L254.7 0.0Z M500.0 4.0Q481.0 4.0 465.8 -2.3Q450.7 -8.7 440.2 -20.3Q429.7 -32.0 424.0 -48.7Q418.3 -65.3 418.3 -86.0Q418.3 -106.7 424.0 -123.3Q429.7 -140.0 440.2 -151.7Q450.7 -163.3 465.8 -169.7Q481.0 -176.0 500.0 -176.0Q519.0 -176.0 534.2 -169.7Q549.3 -163.3 559.8 -151.7Q570.3 -140.0 576.0 -123.3Q581.7 -106.7 581.7 -86.0Q581.7 -65.3 576.0 -48.7Q570.3 -32.0 559.8 -20.3Q549.3 -8.7 534.2 -2.3Q519.0 4.0 500.0 4.0ZM500.0 -24.7Q520.0 -24.7 531.8 -36.8Q543.7 -49.0 543.7 -73.0V-99.0Q543.7 -123.0 531.8 -135.2Q520.0 -147.3 500.0 -147.3Q480.0 -147.3 468.2 -135.2Q456.3 -123.0 456.3 -99.0V-73.0Q456.3 -49.0 468.2 -36.8Q480.0 -24.7 500.0 -24.7Z M677.7 0.0 616.0 -172.0H653.7L677.3 -99.3L699.7 -30.3H701.7L724.0 -99.3L747.7 -172.0H784.0L722.3 0.0Z M964.0 0.0Q948.3 0.0 940.5 -8.0Q932.7 -16.0 931.0 -29.0H929.3Q924.3 -13.3 911.2 -4.7Q898.0 4.0 877.7 4.0Q851.3 4.0 835.7 -9.8Q820.0 -23.7 820.0 -48.0Q820.0 -73.0 838.5 -86.2Q857.0 -99.3 895.3 -99.3H928.3V-112.7Q928.3 -147.7 891.3 -147.7Q874.7 -147.7 864.3 -141.2Q854.0 -134.7 847.0 -124.0L825.3 -141.7Q832.7 -155.7 850.0 -165.8Q867.3 -176.0 894.7 -176.0Q927.3 -176.0 946.0 -160.3Q964.7 -144.7 964.7 -115.0V-28.7H986.3V0.0ZM888.0 -22.7Q905.7 -22.7 917.0 -30.7Q928.3 -38.7 928.3 -51.3V-76.3H896.0Q856.7 -76.3 856.7 -52.7V-46.0Q856.7 -34.3 865.0 -28.5Q873.3 -22.7 888.0 -22.7Z'

/** Tight bounds of the path above: `minX minY width height`, SVG convention. */
export const WORDMARK_VIEWBOX = '28.0 -232.7 958.3 236.7'

/** The word the path spells, for the accessible name where one is wanted. */
export const WORDMARK_TEXT = 'Rxova'
