/**
 * A project's walkthrough: one job done by hand, then with the project, with
 * numbered notes pairing each problem on the first side with its fix on the
 * second. Rendered by ../components/Walkthrough.astro; each project's story
 * lives in ../showcases/<id>/.
 *
 * Plain TypeScript with no imports, so vitest can load it without Astro.
 */

/** One problem on the `before` side and the fix for it on the `after` side. */
export interface Note {
  problem: string
  fix: string
  /**
   * Fragments of the lines each side's note points at. Every line containing
   * one is marked with the note's number in the code's gutter.
   */
  lines: { before: readonly string[]; after: readonly string[] }
}

export interface Side {
  /** The tab, e.g. "By hand" or "With journey". */
  label: string
  code: string
  /** Expressive Code language: ts, tsx, diff, sh… */
  lang: string
}

export interface Showcase {
  heading: string
  lede: string
  before: Side
  after: Side
  notes: readonly Note[]
}

/**
 * The gutter markers for one side: every line a note points at, labelled with
 * the note's number. One marker per line rather than one per block, so every
 * highlighted line carries its number — a block shows its label on its first
 * line only, and the rest read as unnumbered.
 *
 * A fragment that matches no line throws, which fails the build — a note that
 * points at nothing is how a label ends up on the wrong line after an edit.
 */
export function lineMarkers(
  code: string,
  notes: readonly Note[],
  side: 'before' | 'after',
): { range: string; label: string }[] {
  const lines = code.split('\n')
  return notes.flatMap((note, index) => {
    const numbers = note.lines[side].flatMap((fragment) => {
      const found = lines.flatMap((line, at) => (line.includes(fragment) ? [at + 1] : []))
      if (found.length === 0) {
        throw new Error(`note ${String(index + 1)}: no ${side} line has ${fragment}`)
      }
      return found
    })
    return [...new Set(numbers)]
      .sort((a, b) => a - b)
      .map((line) => ({ range: String(line), label: String(index + 1) }))
  })
}
