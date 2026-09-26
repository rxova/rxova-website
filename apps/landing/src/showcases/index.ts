/**
 * Each project's walkthrough, by project id. See ../lib/walkthrough.ts for the
 * shape, and ./<id>/story.ts for each one.
 *
 * A project without an entry here shows its snippet on the landing instead.
 */
import type { Showcase } from '../lib/walkthrough'
import { story as journey } from './journey/story'
import { story as overlock } from './overlock/story'
import { story as reactInputs } from './react-inputs/story'
import { story as tsExtendedErrors } from './ts-extended-errors/story'
import { story as useEverywhere } from './use-everywhere/story'

export const showcases: Readonly<Record<string, Showcase>> = {
  journey,
  'react-inputs': reactInputs,
  'use-everywhere': useEverywhere,
  'ts-extended-errors': tsExtendedErrors,
  overlock,
}
