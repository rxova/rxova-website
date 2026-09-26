import { describe, expect, it } from 'vitest'

import CodeRecipes from '../src/components/CodeRecipes.astro'
import { render } from './render.ts'

describe('CodeRecipes', () => {
  it('renders a linked heading and the source, verbatim, for each recipe', async () => {
    const html = await render(CodeRecipes, {
      props: {
        idPrefix: 'integration',
        recipes: [
          { id: 'mui', label: 'Material UI', href: 'https://mui.com', source: 'const a = 1\n  b' },
        ],
      },
    })
    expect(html).toContain(
      '<h3 class="rx-recipe__title" id="integration-mui"><a href="https://mui.com">Material UI</a></h3>',
    )
    // No whitespace of the template's own inside the pre: the source starts where it starts.
    expect(html).toContain('<pre class="rx-recipe__source"><code>const a = 1\n  b</code></pre>')
  })

  it('defaults the id prefix to recipe', async () => {
    const html = await render(CodeRecipes, {
      props: { recipes: [{ id: 'x', label: 'X', href: '/x', source: '' }] },
    })
    expect(html).toContain('id="recipe-x"')
  })
})
