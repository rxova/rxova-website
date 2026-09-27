import { describe, expect, it } from 'vitest'

import { shellFor } from './shell'

describe('shellFor', () => {
  it.each([
    [{ id: 'journey' }, '/packages/journey/', 'journey'],
    [{ id: 'journey', kind: 'package' as const }, '/packages/journey/', 'journey'],
    [{ id: 'blog', kind: 'site' as const }, '/blog/', undefined],
    [
      { id: 'storybook-react-inputs', kind: 'storybook' as const },
      '/storybook/react-inputs/',
      undefined,
    ],
  ])('builds %j for %s', (source, path, project) => {
    expect(shellFor(source)).toEqual({ path, project })
  })
})
