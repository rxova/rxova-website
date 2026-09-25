import { spawnSync } from 'node:child_process'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

/** A gate step: either a package.json script, or one Turbo invocation. */
export type VerifyStep = {
  readonly name: string
  readonly script?: string
  readonly turbo?: readonly string[]
}

/** Just the part of spawnSync's result the runner reads. */
export type StepResult = { readonly status: number | null; readonly error?: unknown }

export type RunVerifyOptions = {
  log?: (message: string) => void
  error?: (message: string) => void
  run?: (step: VerifyStep) => StepResult
}

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
  { name: 'Audit dependencies', script: 'audit:check' },
  // Cached by Turbo on the lockfile + manifests (see turbo.json) rather than
  // run directly, which turns the slowest of the cheap steps into a replay
  // whenever the dependency graph is untouched.
  { name: 'Check dependency dedupe', turbo: ['//#dedupe:check'] },
  { name: 'Check formatting', script: 'format:check' },
  { name: 'Lint', script: 'lint' },
  // One Turbo invocation instead of five sequential `pnpm run`s: it already
  // knows the ordering, so it parallelises across the two packages and pays the
  // pnpm+turbo startup once rather than five times. check:exports is only a
  // manifest read, so it joins the batch.
  { name: 'Check the docs registry', script: 'check:registry' },
  {
    name: 'Typecheck, tests, Astro check, social cards, site builds and package metadata',
    turbo: [
      'typecheck',
      '//#test',
      'check:astro',
      'check:og',
      'build',
      'check:exports',
      'test',
      '//#validate:content',
    ],
  },
  // Kept out of the combined run: it shells out to a real `pnpm pack` into a
  // temp dir, which races on the pnpm store if run concurrently with anything
  // else. Hence --concurrency=1 in the root script.
  { name: 'Smoke-test the package tarball', script: 'pack:smoke' },
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
}: RunVerifyOptions = {}): number {
  for (const [index, step] of steps.entries()) {
    log(`\n[${index + 1}/${steps.length}] ${step.name}`)
    const result = run(step)
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
