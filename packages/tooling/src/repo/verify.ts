import { spawnSync } from 'node:child_process'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

/** A gate step: either a package.json script, or one Turbo invocation. */
export type VerifyStep = {
  readonly name: string
  readonly script?: string
  readonly turbo?: readonly string[]
  /** Skipped on the release PR, whose only change is the version bump. */
  readonly skipOnRelease?: boolean
}

/** Just the part of spawnSync's result the runner reads. */
export type StepResult = { readonly status: number | null; readonly error?: unknown }

export type RunVerifyOptions = {
  log?: (message: string) => void
  error?: (message: string) => void
  run?: (step: VerifyStep) => StepResult
  env?: NodeJS.ProcessEnv
}

/** The branch changesets opens for a release. */
export const RELEASE_BRANCH = 'changeset-release/main'

/**
 * One ordered definition of "is this releasable", executed locally by the
 * pre-push hook. CI runs the same checks split across parallel jobs, and the
 * release workflow gates on that CI run succeeding rather than re-running them.
 *
 * The point of a single list is that the local gate and CI cannot drift: if the
 * audit lived only in the CI workflow, a green local push could still be
 * carrying dependencies CI would have blocked.
 *
 * Ordered cheapest-and-most-likely-to-fail first, so a formatting slip surfaces
 * in a second rather than after the preview site has built.
 *
 * Every step is skip-cheap when nothing it reads has changed, and the skipping
 * is driven by content hashes, never by a git diff — Turbo hashes the files
 * that feed each task, and eslint/prettier key on file content plus config. A
 * rebased or cherry-picked tree that ends up byte-identical replays; one that
 * does not re-runs. There is no git state that can make this silently
 * under-check.
 */
export const steps: readonly VerifyStep[] = [
  { name: 'Audit dependencies', script: 'audit:check', skipOnRelease: true },
  // Through Turbo, so an untouched dependency graph replays instead of re-resolving.
  { name: 'Check dependency dedupe', turbo: ['//#dedupe:check'], skipOnRelease: true },
  { name: 'Check formatting', script: 'format:check' },
  { name: 'Lint', script: 'lint' },
  { name: 'Check file sizes', script: 'check:size' },
  { name: 'Check the docs registry', script: 'check:registry' },
  {
    // One Turbo run: it orders and parallelises the tasks and starts once.
    name: 'Typecheck, tests, Astro check, social cards, site builds and package metadata',
    turbo: [
      'typecheck',
      'check:astro',
      'check:og',
      'build',
      'check:exports',
      'test',
      '//#validate:content',
    ],
  },
  // On its own: `pnpm pack` races on the store if anything runs beside it.
  { name: 'Smoke-test the package tarball', script: 'pack:smoke', skipOnRelease: true },
]

/** The argv a step turns into. Split out from the spawn so it can be asserted on. */
export function stepCommand(step: VerifyStep): string[] {
  return step.turbo ? ['exec', 'turbo', 'run', ...step.turbo] : ['run', step.script!]
}

export const runStep = (step: VerifyStep, spawn = spawnSync): StepResult =>
  spawn('pnpm', stepCommand(step), { stdio: 'inherit' })

export function runVerify({
  log = console.log,
  error = console.error,
  run = runStep,
  env = process.env,
}: RunVerifyOptions = {}): number {
  const release = env.GITHUB_HEAD_REF === RELEASE_BRANCH
  // GitHub folds each step into its own log group, so CI keeps a per-step view.
  const actions = env.GITHUB_ACTIONS === 'true'
  for (const [index, step] of steps.entries()) {
    const title = `[${index + 1}/${steps.length}] ${step.name}`
    if (release && step.skipOnRelease) {
      log(`\n${title}: skipped on the release branch`)
      continue
    }
    log(actions ? `::group::${title}` : `\n${title}`)
    const result = run(step)
    if (actions) log('::endgroup::')
    if (result.status !== 0) {
      error(`\n✗ ${step.name} failed. Fix it and re-run \`pnpm run verify\`.`)
      return result.status ?? 1
    }
  }

  log(`\n✓ all ${steps.length} stages passed`)
  return 0
}

// Guarded: without this, importing the module to read `steps` or to exercise
// `runVerify` with a stubbed runner would execute the whole gate and then kill
// the test process. That is precisely what kept this file untested.
/* v8 ignore start -- the entry-point guard; `pnpm run verify` is what runs it */
const isEntrypoint =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href

if (isEntrypoint) {
  process.exit(runVerify())
}
/* v8 ignore stop */
