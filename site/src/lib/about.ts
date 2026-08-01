/**
 * Who maintains rxova, and what the projects have in common.
 *
 * Two things live here, because two surfaces need the same words: the landing
 * shows the short form of each (a maintainer strip, a "Why rxova" grid) and
 * /about shows the long form. Written twice they would drift, and this is copy
 * where drift is expensive — a principle stated one way on the home page and
 * another way a click later reads as marketing rather than as a rule the code
 * follows.
 *
 * Not in `sources.json`: that file says what rxova.org is *assembled from* —
 * which projects exist, whether they are on, how they are mounted — and every
 * script in `scripts/` reads it. None of them has any business parsing a bio.
 * This is landing prose, so it sits with the landing, typed, next to
 * `projects.ts`.
 */

export interface MaintainerLink {
  label: string
  href: string
  /** Every one of these leaves rxova.org. */
  external: true
}

/**
 * The person behind the projects.
 *
 * Deliberately singular. rxova is one maintainer's work, and saying so is both
 * true and more useful to a reader deciding whether to depend on it than an
 * invented "we" would be — it sets the right expectation about scope, response
 * times and bus factor.
 */
export const MAINTAINER = {
  name: 'Jonatan Kruszewski',
  role: 'Senior Frontend Engineer',
  /** The landing's one-paragraph version. */
  summary:
    'Senior Frontend Engineer focused on React architecture, reusable developer infrastructure, and tools for complex user interfaces. rxova is where I build focused open-source libraries with stable APIs, strong TypeScript support, thorough testing, and documentation that answers the question you actually arrived with.',
  links: [
    { label: 'GitHub', href: 'https://github.com/jonatankruszewski', external: true },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/jonatankruszewski', external: true },
    { label: 'Medium', href: 'https://medium.com/@jonakrusze', external: true },
    {
      label: 'Stack Overflow',
      href: 'https://stackoverflow.com/users/17625486/jonatan-kruszewski',
      external: true,
    },
  ] as const satisfies readonly MaintainerLink[],
  /** The project address, not a personal one — issues and mail age better in the open. */
  email: 'rxova@proton.me',
  /** The organisation the packages are published from. */
  org: 'https://github.com/rxova',
} as const

export interface Principle {
  /** Stable id — also the anchor on /about, so don't rename one casually. */
  id: string
  title: string
  /** One or two sentences. The landing shows this. */
  summary: string
  /** The same rule, with the evidence. /about shows this under the summary. */
  detail: string
}

/**
 * What Journey, react-inputs and use-everywhere have in common.
 *
 * The landing used to assert that the libraries were "focused and
 * dependency-light" and leave it there, which is a claim rather than a
 * standard. These are the four rules the projects are actually built to, each
 * stated so that a reader can check it against the code and catch us failing
 * it.
 */
export const PRINCIPLES: readonly Principle[] = [
  {
    id: 'focused-apis',
    title: 'Focused APIs, not frameworks',
    summary:
      'Each library solves one problem and stops there. No plugin system, no configuration to learn before the first useful line.',
    detail:
      'Journey models flow graphs — it does not route, fetch, or render for you. react-inputs ships inputs, not a design system. A small surface is one you can hold in your head, and it is the only kind that can credibly promise to stay stable, because most of the work of keeping an API still is saying no to what does not belong in it.',
  },
  {
    id: 'typescript-first',
    title: 'TypeScript-first, with explicit framework boundaries',
    summary:
      'Types are part of the public API, not generated as an afterthought — and the framework-agnostic core always ships apart from its React bindings.',
    detail:
      'That boundary is a package, not a convention: @rxova/journey-core and @rxova/journey-react are separate installs, and so are @use-everywhere/core and use-everywhere. The core runs in a worker, a test, or a non-React app; the bindings stay thin enough to read in one sitting. Autocomplete is expected to answer most usage questions before the docs do.',
  },
  {
    id: 'production-behaviour',
    title: 'Accessible, tested, production-oriented behaviour',
    summary:
      'Keyboard handling, ARIA, focus, and locale are part of the component — not an issue filed after launch.',
    detail:
      'These libraries exist mostly because of the details that get skipped: the caret jumping to the end of a currency field mid-typing, a paste into the second OTP slot that should fill all six, a rating control that cannot be reached with a keyboard. Those cases are what the test suites are about, and they are the reason a component that looks trivial is worth taking as a dependency.',
  },
  {
    id: 'incremental-adoption',
    title: 'Independent packages, adopted one at a time',
    summary:
      'Nothing here requires anything else here. Take one package, keep the rest of your stack exactly as it is.',
    detail:
      'There is no meta-package and no shared runtime you are opted into by installing one library. Dependency lists stay short and reviewable on purpose, so that adopting a package is a decision about that package alone — and so that dropping it later is a single uninstall rather than an unpicking.',
  },
] as const
