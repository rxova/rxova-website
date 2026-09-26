import { describe, expect, it } from 'vitest'

import {
  astroBlocks,
  commentBlocks,
  commentProblems,
  cssBlocks,
  isChecked,
  proseLines,
  scriptBlocks,
  yamlBlocks,
} from './check-comments.ts'

describe('isChecked', () => {
  it.each([
    'a.ts',
    'b.mjs',
    'c.astro',
    'd.css',
    '.github/workflows/ci.yml',
    'turbo.json',
    'x/tsconfig.base.json',
  ])('checks %s', (path) => expect(isChecked(path)).toBe(true))

  it.each([
    'package.json',
    'README.md',
    'pnpm-lock.yaml',
    'apps/landing/src/showcases/journey/before.ts',
    'apps/landing/src/showcases/journey/after.tsx',
  ])('skips %s', (path) => expect(isChecked(path)).toBe(false))
})

describe('proseLines', () => {
  it.each([
    ['// one', 1],
    ['/** one */', 1],
    ['/**\n * one\n * two\n */', 2],
    ['/* a\n   b\n   c */', 3],
    ['<!-- a\n b -->', 2],
    ['{/* a */}', 1],
    ['# yaml', 1],
    ['/**\n *\n * one\n */', 1],
  ])('counts %j as %i', (comment, lines) => expect(proseLines(comment)).toBe(lines))

  it('leaves directives out', () => {
    expect(proseLines('// @ts-check')).toBe(0)
    expect(proseLines('/// <reference types="astro/client" />')).toBe(0)
    expect(proseLines('/* v8 ignore start */')).toBe(0)
    expect(proseLines('// eslint-disable-next-line no-console')).toBe(0)
  })
})

describe('scriptBlocks', () => {
  it('merges line comments on consecutive lines into one block', () => {
    expect(scriptBlocks('// a\n// b\n// c\nconst x = 1\n// d')).toEqual([
      { line: 1, lines: 3 },
      { line: 5, lines: 1 },
    ])
  })

  it('keeps a blank line between two runs apart', () => {
    expect(scriptBlocks('// a\n\n// b\nconst x = 1')).toEqual([
      { line: 1, lines: 1 },
      { line: 3, lines: 1 },
    ])
  })

  it('is not fooled by comment-like strings and regexes', () => {
    expect(
      scriptBlocks("const g = 'src/**/*.ts'\nconst r = /\\/\\*.*\\*\\//\nconst u = '// x'"),
    ).toEqual([])
  })

  it('counts a block comment by its prose lines', () => {
    expect(scriptBlocks('/**\n * a\n * b\n * c\n */\nexport const x = 1')).toEqual([
      { line: 1, lines: 3 },
    ])
  })
})

describe('cssBlocks', () => {
  it('finds comments and skips strings', () => {
    expect(cssBlocks('a { content: "/* no */"; }\n/* one\n   two\n   three */\nb {}')).toEqual([
      { line: 2, lines: 3 },
    ])
  })

  it('tolerates an unterminated string or comment', () => {
    expect(cssBlocks("a { content: 'x }")).toEqual([])
    expect(cssBlocks('/* open')).toEqual([{ line: 1, lines: 1 }])
  })
})

describe('yamlBlocks', () => {
  it('merges whole-line comments and counts trailing ones alone', () => {
    expect(yamlBlocks('# a\n# b\n# c\nkey: 1 # trailing\nother: 2')).toEqual([
      { line: 1, lines: 4 },
    ])
    expect(yamlBlocks('# a\n\nkey: 1 # trailing')).toEqual([
      { line: 1, lines: 1 },
      { line: 3, lines: 1 },
    ])
  })

  it('ignores a hash inside a quoted value', () => {
    expect(yamlBlocks("run: echo 'a # b'")).toEqual([])
  })
})

describe('astroBlocks', () => {
  const source = [
    '---',
    '// one',
    '// two',
    '// three',
    "const q = 'don't'",
    '---',
    "<p>It's fine</p>",
    '<!-- a',
    '     b',
    '     c -->',
    '{/* d */}',
    '<script type="application/ld+json">{"//": "not a comment"}</script>',
    '<script>',
    '  /* e',
    '     f',
    '     g */',
    '</script>',
    '<style>',
    '  /* h */',
    '</style>',
  ].join('\n')

  it('reads each region with its own syntax and reports real line numbers', () => {
    expect(astroBlocks(source)).toEqual([
      { line: 2, lines: 3 },
      { line: 8, lines: 3 },
      { line: 11, lines: 1 },
      { line: 14, lines: 3 },
      { line: 19, lines: 1 },
    ])
  })

  it('handles a file without frontmatter', () => {
    expect(astroBlocks('<p>hi</p>\n<!-- x -->')).toEqual([{ line: 2, lines: 1 }])
  })
})

describe('commentBlocks', () => {
  it('dispatches on the file type', () => {
    expect(commentBlocks('a.css', '/* x */')).toEqual([{ line: 1, lines: 1 }])
    expect(commentBlocks('a.yml', '# x')).toEqual([{ line: 1, lines: 1 }])
    expect(commentBlocks('turbo.json', '{\n  // a\n  // b\n  // c\n  "x": 1\n}')).toEqual([
      { line: 2, lines: 3 },
    ])
    expect(commentBlocks('a.astro', '<!-- x -->')).toEqual([{ line: 1, lines: 1 }])
    expect(commentBlocks('a.ts', '// x')).toEqual([{ line: 1, lines: 1 }])
  })
})

describe('commentProblems', () => {
  it('reports every block over the limit with its place', () => {
    const files = [
      { path: 'a.ts', source: '// 1\n// 2\n// 3\nx()\n// fine' },
      { path: 'b.css', source: '/* fine */' },
    ]
    expect(commentProblems(files)).toEqual(['a.ts:1: 3 lines (limit 2)'])
    expect(commentProblems(files, 3)).toEqual([])
  })
})
