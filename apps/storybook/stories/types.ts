/** Story typing for Astro components: props as args, slot content under `args.slots`. */
import type { AstroRenderer } from '@storybook-astro/framework'
import type { ComponentAnnotations, StoryAnnotations } from 'storybook/internal/types'

/** A slot entry: an HTML string, a component, or a component with its own props and slots. */
type Slot = string | object | readonly (string | object)[]

type Args = Record<string, unknown> & { slots?: Record<string, Slot> }

export type Meta<A extends Args = Args> = ComponentAnnotations<AstroRenderer, A>
export type Story<A extends Args = Args> = StoryAnnotations<AstroRenderer, A>
