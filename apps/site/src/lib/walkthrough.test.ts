import { describe, expect, it } from 'vitest'

import {
  NOTE_MS,
  PLAY_LABELS,
  TURN_MS,
  inlineWalkthroughId,
  stepAt,
  stepCount,
  timeline,
  walkthroughPath,
} from './walkthrough'

describe('timeline', () => {
  it('gives each note its time, and the first fix the turn as well', () => {
    const { starts, end } = timeline(['before', 'before', 'after', 'after'])
    expect(starts).toEqual([0, NOTE_MS, NOTE_MS * 2, NOTE_MS * 3 + TURN_MS])
    expect(end).toBe(NOTE_MS * 4 + TURN_MS)
  })

  it('takes custom durations', () => {
    expect(timeline(['before', 'after'], 10, 5)).toEqual({ starts: [0, 10], end: 25 })
  })

  it('is empty for no steps', () => {
    expect(timeline([])).toEqual({ starts: [], end: 0 })
  })
})

describe('stepAt', () => {
  const starts = [0, 100, 250]

  it.each([
    [0, 0],
    [99, 0],
    [100, 1],
    [249, 1],
    [250, 2],
    [10_000, 2],
  ])('is at step %i at time %i', (t, index) => expect(stepAt(starts, t)).toBe(index))
})

describe('stepCount', () => {
  it('names the side and counts from one', () => {
    expect(stepCount('before', 1, 4)).toBe('Problem 2 of 4')
    expect(stepCount('after', 0, 4)).toBe('Fix 1 of 4')
  })
})

describe('PLAY_LABELS', () => {
  it('names the action the button will take', () => {
    expect(PLAY_LABELS).toEqual({
      playing: 'Pause the walkthrough',
      paused: 'Play the walkthrough',
      ended: 'Replay the walkthrough',
    })
  })
})

describe('walkthroughPath', () => {
  it('is a directory-style path under /walkthroughs/', () => {
    expect(walkthroughPath('journey')).toBe('/walkthroughs/journey/')
  })
})

describe('inlineWalkthroughId', () => {
  const has = (ids: string[]) => (id: string) => ids.includes(id)

  it('is the featured project when it has a walkthrough', () => {
    expect(inlineWalkthroughId(['a', 'b', 'c'], 'b', has(['a', 'b']))).toBe('b')
  })

  it('falls back to the first project that has one', () => {
    expect(inlineWalkthroughId(['a', 'b', 'c'], 'a', has(['c', 'b']))).toBe('b')
  })

  it('is undefined when no project has one', () => {
    expect(inlineWalkthroughId(['a', 'b'], 'a', has([]))).toBeUndefined()
  })
})
