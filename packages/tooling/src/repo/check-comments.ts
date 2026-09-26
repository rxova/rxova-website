/** Fails on comment blocks longer than two lines. Usage: `pnpm check:comments`. */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import ts from 'typescript'

export const MAX_COMMENT_LINES = 2

/** A comment block: where it starts (1-based) and how many lines of text it holds. */
export interface Block {
  line: number
  lines: number
}

const SCRIPT = /\.(ts|tsx|mts|cts|js|mjs|cjs)$/
const JSONC = /(^|\/)(turbo|tsconfig[\w.-]*)\.json$/
/** The walkthroughs' before/after files are shown on the site, comments and all. */
const IGNORED = /\/showcases\/[^/]+\/(before|after)\.|(^|\/)pnpm-lock\.yaml$/
/** Tool directives, not prose: they never count towards a block's length. */
const DIRECTIVE =
  /^(@ts-|\/ <reference|eslint-|prettier-ignore|v8 ignore|@vitest-environment|@type\b|#!)/

export const isChecked = (path: string): boolean =>
  !IGNORED.test(path) &&
  (SCRIPT.test(path) || JSONC.test(path) || /\.(astro|css|ya?ml)$/.test(path))

const lineAt = (text: string, offset: number): number => text.slice(0, offset).split('\n').length

/** The prose lines of one comment's text, delimiters and directives dropped. */
export function proseLines(comment: string): number {
  return comment
    .replace(/^\{?\s*(\/\*\*?|<!--|\/\/|#)/, '')
    .replace(/(\*\/|-->)\s*\}?$/, '')
    .split('\n')
    .map((line) =>
      line
        .trim()
        .replace(/^(\*(?!\/)|\/\/|#)\s?/, '')
        .trim(),
    )
    .filter((line) => line.length > 0 && !DIRECTIVE.test(line)).length
}

/** Merges `//` or `#` comments on consecutive lines into one block. */
function runs(
  comments: readonly { start: number; text: string; single: boolean }[],
  text: string,
): Block[] {
  const blocks: Block[] = []
  let previous: { end: number; block: Block } | undefined
  for (const c of comments) {
    const line = lineAt(text, c.start)
    const lines = proseLines(c.text)
    if (c.single && previous && line === previous.end + 1) {
      previous.block.lines += lines
      previous.end = line
      continue
    }
    const block = { line, lines }
    blocks.push(block)
    previous = c.single ? { end: line, block } : undefined
  }
  return blocks
}

/** Comments in JS, TS or JSONC, found by the TypeScript parser so strings and regexes never fool it. */
export function scriptBlocks(source: string, offset = 0, whole = source): Block[] {
  const file = ts.createSourceFile('x.ts', source, ts.ScriptTarget.Latest, true)
  const seen = new Set<number>()
  const found: { start: number; text: string; single: boolean }[] = []
  const collect = (ranges: readonly ts.CommentRange[] | undefined) => {
    for (const r of ranges ?? []) {
      if (seen.has(r.pos)) continue
      seen.add(r.pos)
      found.push({
        start: offset + r.pos,
        text: source.slice(r.pos, r.end),
        single: r.kind === ts.SyntaxKind.SingleLineCommentTrivia,
      })
    }
  }
  const visit = (node: ts.Node) => {
    collect(ts.getLeadingCommentRanges(source, node.getFullStart()))
    collect(ts.getTrailingCommentRanges(source, node.getEnd()))
    for (const child of node.getChildren(file)) visit(child)
  }
  visit(file)
  found.sort((a, b) => a.start - b.start)
  return runs(found, whole)
}

/** `/* *\/` comments in CSS, skipping strings. */
export function cssBlocks(source: string, offset = 0, whole = source): Block[] {
  const found: { start: number; text: string; single: boolean }[] = []
  for (let i = 0; i < source.length; i++) {
    const ch = source[i]
    if (ch === '"' || ch === "'") {
      const close = source.indexOf(ch, i + 1)
      i = close === -1 ? source.length : close
    } else if (ch === '/' && source[i + 1] === '*') {
      const close = source.indexOf('*/', i + 2)
      const end = close === -1 ? source.length : close + 2
      found.push({ start: offset + i, text: source.slice(i, end), single: false })
      i = end - 1
    }
  }
  return runs(found, whole)
}

/** `#` comments in YAML: whole-line ones merge into blocks; trailing ones are one line each. */
export function yamlBlocks(source: string): Block[] {
  const found: { start: number; text: string; single: boolean }[] = []
  let offset = 0
  for (const line of source.split('\n')) {
    const at = line.search(/(^|\s)#/)
    if (at !== -1 && !/^\s*[^#\s].*['"].*#.*['"]/.test(line)) {
      const hash = line.indexOf('#', at)
      found.push({ start: offset + hash, text: line.slice(hash), single: true })
    }
    offset += line.length + 1
  }
  return runs(found, source)
}

/** Blanks every match of `re` (keeping offsets true to the file) after handing its body to `read`. */
function lift(
  text: string,
  re: RegExp,
  read: (start: number, body: string, open: string) => void,
): string {
  let out = text
  for (const m of text.matchAll(re)) {
    const [whole, open, body] = m as unknown as [string, string, string]
    read(m.index + open.length, body, open)
    out = out.slice(0, m.index) + ' '.repeat(whole.length) + out.slice(m.index + whole.length)
  }
  return out
}

/** An Astro file, region by region: frontmatter and scripts as TS, styles as CSS, the template's HTML and JSX comments. */
export function astroBlocks(source: string): Block[] {
  const blocks: Block[] = []
  let rest = lift(source, /^(---\n)([\s\S]*?)\n---/g, (start, body) => {
    blocks.push(...scriptBlocks(body, start, source))
  })
  rest = lift(rest, /(<script\b[^>]*>)([\s\S]*?)<\/script>/g, (start, body, open) => {
    if (!/type="application\/(ld\+)?json"/.test(open)) {
      blocks.push(...scriptBlocks(body, start, source))
    }
  })
  rest = lift(rest, /(<style\b[^>]*>)([\s\S]*?)<\/style>/g, (start, body) => {
    blocks.push(...cssBlocks(body, start, source))
  })
  for (const m of rest.matchAll(/<!--[\s\S]*?-->|\{\s*\/\*[\s\S]*?\*\/\s*\}/g)) {
    blocks.push({ line: lineAt(source, m.index), lines: proseLines(m[0]) })
  }
  return blocks.sort((a, b) => a.line - b.line)
}

export function commentBlocks(path: string, source: string): Block[] {
  if (path.endsWith('.astro')) return astroBlocks(source)
  if (path.endsWith('.css')) return cssBlocks(source)
  if (/\.ya?ml$/.test(path)) return yamlBlocks(source)
  if (JSONC.test(path)) return scriptBlocks(`(${source})`, -1, source)
  return scriptBlocks(source)
}

/** Every block over the limit, as `path:line: n lines`. */
export function commentProblems(
  files: readonly { path: string; source: string }[],
  max = MAX_COMMENT_LINES,
): string[] {
  return files.flatMap(({ path, source }) =>
    commentBlocks(path, source)
      .filter((b) => b.lines > max)
      .map((b) => `${path}:${String(b.line)}: ${String(b.lines)} lines (limit ${String(max)})`),
  )
}

/* v8 ignore start -- the entry point; the rules above are what the tests cover */
if (import.meta.main) {
  const root = resolve(import.meta.dirname, '../../../..')
  const tracked = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' })
  const only = process.argv.slice(2)
  const files = tracked
    .split('\n')
    .filter(isChecked)
    .filter((path) => only.length === 0 || only.some((prefix) => path.startsWith(prefix)))
    .map((path) => ({ path, source: readFileSync(resolve(root, path), 'utf8') }))
  const problems = commentProblems(files)
  for (const problem of problems) console.error(`✗ ${problem}`)
  if (problems.length === 0)
    console.log(
      `✓ no comment over ${String(MAX_COMMENT_LINES)} lines in ${String(files.length)} files`,
    )
  process.exitCode = problems.length === 0 ? 0 : 1
}
/* v8 ignore stop */
