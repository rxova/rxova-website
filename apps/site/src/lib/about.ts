/**
 * Who maintains rxova and what the projects share: one source for the landing and /about.
 * Landing prose, so it lives here rather than in `sources.json`.
 */

import type { ProjectId } from '@rxova/brand'

export interface MaintainerLink {
  label: string
  href: string
  /** Every one of these leaves rxova.org. */
  external: true
}

/** The person behind the projects: deliberately singular, since rxova is one maintainer's work. */
export const MAINTAINER = {
  name: 'Jonatan Kruszewski',
  role: 'Senior Frontend Engineer',
  /** The one line under the name on /about's maintainer card. */
  focus:
    'React architecture at application scale, and the types, tests, docs and pipelines that keep it usable a year later. Rxova is that work, done in public.',
  /** The landing's one-paragraph version. */
  summary:
    'Senior Frontend Engineer focused on React architecture, reusable developer infrastructure, and tools for complex user interfaces. Rxova is where I build focused open-source libraries with stable APIs, strong TypeScript support, thorough testing, and documentation that answers the question you actually arrived with.',
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
  email: 'jonatan@rxova.org',
  /** The organisation the packages are published from. */
  org: 'https://github.com/rxova',
} as const

/**
 * What the projects are built to, as opposed to what they do (`PRINCIPLES` covers API shape).
 * Each item must be short enough for a strip and specific enough to be checked.
 */
export interface Standard {
  /**
   * Stable key. The landing maps it to an icon, so renaming one drops that
   * item's glyph rather than breaking the build — keep them still.
   */
  id: string
  /** Two or three words. The strip shows this at full contrast. */
  label: string
  /** One clause saying what the label actually commits to. */
  detail: string
}

export const STANDARDS: readonly Standard[] = [
  // First: the whole proposition, each library judged on removing one pain point.
  {
    id: 'one-pain-point',
    label: 'One pain point each',
    detail: 'A specific problem, solved in a practical way, and nothing beyond it.',
  },
  {
    id: 'production-grade',
    label: 'Production grade',
    detail: 'Built to be depended on, not to demo well.',
  },
  {
    id: 'zero-dependencies',
    label: 'Zero runtime dependencies',
    // Precise because `npm view <pkg> dependencies` can disprove it: only rxova
    // packages are ever listed, and React is always a peer.
    detail: 'No third-party packages — only our own, with React always a peer.',
  },
  {
    id: 'tree-shakeable',
    label: 'Tree shakeable',
    // Checkable in each package.json: ESM, with `sideEffects` declared.
    detail: 'ESM with side effects declared: import one piece and the bundle keeps only that.',
  },
  {
    id: 'tested',
    label: 'Tested where it matters',
    detail: 'The edge cases that made each library necessary are the suite.',
  },
  {
    id: 'modern-toolchain',
    label: 'Modern toolchain',
    detail: 'tsdown, TypeScript and pnpm — no legacy build to inherit.',
  },
  {
    id: 'clean-ci',
    label: 'Clean CI',
    detail: 'Nothing publishes from a red build.',
  },
  {
    id: 'answered-quickly',
    label: 'Answered quickly',
    detail: 'Issues and pull requests do not sit.',
  },
] as const

/** A small picture of a principle on its /about card. */
export type PrincipleVisual =
  | { kind: 'packages'; core: string; bindings: string }
  | { kind: 'tags'; tags: readonly string[] }
  | { kind: 'command'; command: string }

export interface Principle {
  /** Stable id — also the anchor on /about, so don't rename one casually. */
  id: string
  title: string
  /** One or two sentences. The landing shows this. */
  summary: string
  /** The STANDARDS id whose icon the /about card borrows. */
  icon: string
  /** The /about card: a shorter title, one line, and an optional picture. */
  card: { title: string; line: string; visual?: PrincipleVisual }
}

/**
 * What journey, react-inputs and use-everywhere have in common: four rules, each
 * stated so a reader can check it against the code.
 */
export const PRINCIPLES: readonly Principle[] = [
  {
    id: 'focused-apis',
    title: 'Focused APIs, DX first',
    summary:
      "Each library solves one problem with an API that feels native where you use it, typed end to end. Nothing to set up before the first useful line; extras such as journey's plugins are opt-in.",
    icon: 'one-pain-point',
    card: {
      title: 'Focused APIs, DX first',
      line: 'One problem each, an API that feels native, and nothing to set up before the first useful line. Extras such as plugins are opt-in.',
    },
  },
  {
    id: 'typescript-first',
    title: 'TypeScript-first, with explicit framework boundaries',
    summary:
      'Types are part of the public API, not generated as an afterthought — and the framework-agnostic core always ships apart from its React bindings.',
    icon: 'modern-toolchain',
    card: {
      title: 'TypeScript-first, framework at the edge',
      line: 'The core ships apart from its React bindings, so it runs in a worker, a test, or no React at all.',
      visual: { kind: 'packages', core: 'journey-core', bindings: 'journey-react' },
    },
  },
  {
    id: 'production-behaviour',
    title: 'Accessible, tested, production-oriented behaviour',
    summary:
      'Keyboard handling, ARIA, focus, and locale are part of the component, and tested: unit tests at 90%+ coverage plus end-to-end suites for the edge cases, not only the happy path.',
    icon: 'tested',
    card: {
      title: 'Accessible and tested by default',
      line: 'Part of the component, not an issue filed after launch. Unit tests at 90%+ coverage, and end-to-end suites that cover the edge cases, not only the happy path.',
      visual: { kind: 'tags', tags: ['keyboard', 'ARIA', 'focus', 'locale'] },
    },
  },
  {
    id: 'incremental-adoption',
    title: 'Independent packages, adopted one at a time',
    summary:
      'Nothing here requires anything else here. Take one package, keep the rest of your stack exactly as it is.',
    icon: 'zero-dependencies',
    card: {
      title: 'Take one, keep your stack',
      line: 'No meta-package, no shared runtime. Dropping one later is a single uninstall.',
      visual: { kind: 'command', command: 'pnpm add @rxova/journey-core' },
    },
  },
] as const

/** A bug that was fixed privately more than once before it became a package; /about draws each. */
export interface Origin {
  id: 'currency' | 'otp' | 'flow' | 'errors'
  bug: string
  project: ProjectId
}

export const ORIGINS: readonly Origin[] = [
  {
    id: 'currency',
    bug: 'The caret jumps to the end of a currency field mid-typing.',
    project: 'react-inputs',
  },
  {
    id: 'otp',
    bug: 'A pasted code lands in one OTP slot instead of all six.',
    project: 'react-inputs',
  },
  {
    id: 'flow',
    bug: 'A branching, multi-step flow decays into booleans and effects.',
    project: 'journey',
  },
  {
    id: 'errors',
    bug: 'An error sent through JSON arrives as {}: its class, code and cause are gone.',
    project: 'ts-extended-errors',
  },
] as const

/** What one maintainer commits to. */
export const COMMITMENTS = {
  promised: [
    'Issues get read',
    'Security reports come first',
    'No API break without a major and a migration note',
    'Extensive documentation',
    'High test coverage',
  ],
} as const

/** The contributions worth most, smallest first; `id` picks the card's icon. */
export interface Contribution {
  id: 'repro' | 'pull-request' | 'docs'
  title: string
  line: string
}

export const CONTRIBUTIONS: readonly Contribution[] = [
  {
    id: 'repro',
    title: 'A minimal repro',
    line: 'Worth more than a patch. Making a bug happen on demand is most of the fix.',
  },
  {
    id: 'pull-request',
    title: 'A focused pull request',
    line: 'One behaviour, with the test that fails without it. Big refactors start as an issue.',
  },
  {
    id: 'docs',
    title: 'A docs fix',
    line: 'If something cost you an hour, saying so already counts.',
  },
] as const
