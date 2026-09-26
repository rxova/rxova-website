/**
 * A project's walkthrough: one job done by hand, then with the project, with
 * numbered notes pairing each problem on the first side with its fix on the
 * second. Rendered by ../components/walkthrough/; each project's story
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

/** How long each note stays up, and the extra pause at the turn from Before to After. */
export const NOTE_MS = 3600
export const TURN_MS = 1200

/** When each step starts and when the tour ends: the view is a function of one clock. */
export function timeline(
  sides: readonly string[],
  noteMs = NOTE_MS,
  turnMs = TURN_MS,
): { starts: number[]; end: number } {
  const starts: number[] = []
  let clock = 0
  sides.forEach((side, index) => {
    starts.push(clock)
    const turning = side === 'after' && sides[index - 1] === 'before'
    clock += noteMs + (turning ? turnMs : 0)
  })
  return { starts, end: clock }
}

/** The step in play at time `t`: the last one to have started. */
export function stepAt(starts: readonly number[], t: number): number {
  let index = 0
  for (const [i, start] of starts.entries()) if (start <= t) index = i
  return index
}

export type PlayState = 'playing' | 'paused' | 'ended'

/** The play button's accessible name in each state. */
export const PLAY_LABELS: Record<PlayState, string> = {
  playing: 'Pause the walkthrough',
  paused: 'Play the walkthrough',
  ended: 'Replay the walkthrough',
}

/** "Problem 2 of 4" on the Before side, "Fix 2 of 4" on the After. */
export const stepCount = (side: string, index: number, total: number): string =>
  `${side === 'before' ? 'Problem' : 'Fix'} ${String(index + 1)} of ${String(total)}`
