/**
 * What a landing snippet imports, and whether that is something the project
 * actually publishes.
 *
 * Shared by two readers that must agree: the landing build (../lib/projects.ts),
 * which refuses a snippet importing a package the project does not ship, and
 * scripts/links.test.mjs, which asks npm whether each imported package exists.
 * The ts-extended-errors card once imported `@rxova/ts-extended-errors` while
 * brand listed the unscoped name — well-formed, and wrong in a way neither
 * reader could see on its own.
 *
 * Plain TypeScript with no imports, so vitest can load it without Astro or the
 * brand package's Vite-only entry points.
 */

/** Imports a snippet may take besides the project's own packages. */
export const PEER_IMPORTS: readonly string[] = ['react', 'react-dom']

/** `@scope/name/sub` -> `@scope/name`; `name/sub` -> `name`. */
export function packageName(specifier: string): string {
  const parts = specifier.split('/')
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]
}

/** Bare package specifiers a snippet imports from, skipping relative paths and node builtins. */
export function snippetImports(snippet: string): string[] {
  const specifiers = [...snippet.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)].map((m) => m[1])
  return [
    ...new Set(
      specifiers.filter((s) => !s.startsWith('.') && !s.startsWith('node:')).map(packageName),
    ),
  ]
}

/**
 * Problems with what `snippet` imports, given the packages its project
 * publishes; empty when there are none.
 *
 * A snippet with no imports at all — a shell command, a bare JSX fragment — has
 * nothing to check and passes. One that imports must name at least one of the
 * project's own packages (otherwise it is not showing this project), and
 * nothing outside those and {@link PEER_IMPORTS}.
 */
export function checkSnippetImports(snippet: string, packages: readonly string[]): string[] {
  const imports = snippetImports(snippet)
  if (imports.length === 0) return []

  const problems = imports
    .filter((name) => !packages.includes(name) && !PEER_IMPORTS.includes(name))
    .map((name) => `imports "${name}", which is not one of its packages (${packages.join(', ')})`)

  if (!imports.some((name) => packages.includes(name))) {
    problems.push(`imports none of its own packages (${packages.join(', ')})`)
  }
  return problems
}
