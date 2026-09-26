/** Builds a checkout the way CI and the deploy do, and assembles its site from local artifacts. */
import { execFileSync } from 'node:child_process'
import { access, cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import {
  PAGE_BUNDLE_FILENAME,
  baseFor,
  createPageBundleManifest,
  type SourceKind,
} from '@rxova/website-schemas'

import type { SnapshotRoot } from './snapshot.ts'

interface WorkspacePackage {
  name: string
  path: string
  private?: boolean
}

interface Source {
  id: string
  kind?: SourceKind
  enabled?: boolean
}

/** Package names by role; the first that exists wins, so a checkout from before a rename still builds. */
const LANDING = ['@rxova/landing', '@rxova/homepage-site']
const PREVIEW = ['@rxova/preview']
/** Where each layout keeps the assembler. */
const ASSEMBLERS = [
  'packages/tooling/src/deploy/assemble.ts',
  'packages/tooling/src/deploy/assemble.mjs',
  'scripts/assemble.mjs',
]

const exists = (path: string) =>
  access(path).then(
    () => true,
    () => false,
  )

function run(cwd: string, command: string, args: string[], env: NodeJS.ProcessEnv = {}): string {
  return execFileSync(command, args, {
    cwd,
    env: { ...process.env, ...env },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  })
}

function workspacePackages(repoRoot: string): WorkspacePackage[] {
  return JSON.parse(
    run(repoRoot, 'pnpm', ['-r', 'ls', '--json', '--depth', '-1']),
  ) as WorkspacePackage[]
}

function pick(packages: WorkspacePackage[], names: readonly string[]): WorkspacePackage {
  const found = names.map((name) => packages.find((p) => p.name === name)).find(Boolean)
  if (!found) throw new Error(`no workspace package named ${names.join(' or ')}`)
  return found
}

/** Builds from an empty dist, as a fresh CI checkout does: a cache replay does not clear stale files. */
async function turboBuild(repoRoot: string, pkg: WorkspacePackage, env: NodeJS.ProcessEnv = {}) {
  await rm(join(pkg.path, 'dist'), { recursive: true, force: true })
  run(
    repoRoot,
    'pnpm',
    ['exec', 'turbo', 'run', 'build', `--filter=${pkg.name}`, '--output-logs=errors-only'],
    env,
  )
}

/**
 * A minimal page-component bundle standing in for a project's docs, which live in other repos:
 * its index, plus a page at every redirect target under its base so the redirects resolve.
 */
async function writeFixtureDocs(
  dir: string,
  id: string,
  base: string,
  targets: string[],
): Promise<void> {
  const pages = ['', ...targets.filter((t) => t.startsWith(base)).map((t) => t.slice(base.length))]
  for (const page of pages) {
    await mkdir(join(dir, page), { recursive: true })
    await writeFile(
      join(dir, page, 'index.html'),
      `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${id}</title></head>` +
        `<body><main><h1>${id}/${page}</h1><p>Fixture docs.</p></main></body></html>\n`,
    )
  }
}

export interface LockBuild {
  roots: SnapshotRoot[]
  /** `npm pack` file lists and exports of every published package, by name. */
  packs: Record<string, { exports: unknown; files: string[] }>
}

export async function buildCheckout(repoRoot: string, workDir: string): Promise<LockBuild> {
  const packages = workspacePackages(repoRoot)
  const landing = pick(packages, LANDING)
  const preview = pick(packages, PREVIEW)
  await turboBuild(repoRoot, landing)
  await turboBuild(repoRoot, preview)

  const raw = JSON.parse(await readFile(join(repoRoot, 'sources.json'), 'utf8')) as {
    sources: Source[]
  }
  const redirects = JSON.parse(await readFile(join(repoRoot, 'redirects.json'), 'utf8')) as {
    redirects: Record<string, string>
  }
  const targets = Object.values(redirects.redirects)
  const artifacts = join(workDir, 'artifacts')
  await rm(workDir, { recursive: true, force: true })
  await cp(join(landing.path, 'dist'), join(artifacts, 'landing'), { recursive: true })

  for (const source of raw.sources.filter((s) => s.enabled === true)) {
    const kind = source.kind ?? 'package'
    const base = baseFor(source.id, kind)
    const dir = join(artifacts, `docs-${source.id}`)
    const surface = packages.find((p) => p.name === `@rxova/${source.id}`)
    if (kind === 'site' && surface) {
      await turboBuild(repoRoot, surface, { DOCS_BASE_URL: base })
      await cp(join(surface.path, 'dist'), dir, { recursive: true })
    } else {
      await writeFixtureDocs(dir, source.id, base, targets)
    }
    const manifest = createPageBundleManifest(source.id, base)
    await writeFile(join(dir, PAGE_BUNDLE_FILENAME), `${JSON.stringify(manifest, null, 2)}\n`)
  }

  const assembler = (
    await Promise.all(
      ASSEMBLERS.map(async (p) => ((await exists(join(repoRoot, p))) ? p : undefined)),
    )
  ).find(Boolean)
  if (!assembler) throw new Error(`no assembler found in ${repoRoot}`)
  const site = join(workDir, '_site')
  run(repoRoot, 'node', [assembler, artifacts, site])

  const packs: LockBuild['packs'] = {}
  for (const pkg of packages.filter((p) => p.private !== true)) {
    const manifest = JSON.parse(await readFile(join(pkg.path, 'package.json'), 'utf8')) as {
      exports?: unknown
    }
    const [packed] = JSON.parse(
      run(pkg.path, 'npm', ['pack', '--dry-run', '--json', '--ignore-scripts']),
    ) as [{ files: { path: string }[] }]
    packs[pkg.name] = { exports: manifest.exports, files: packed.files.map((f) => f.path).sort() }
  }

  return {
    roots: [
      { name: 'site', dir: site },
      { name: 'preview', dir: join(preview.path, 'dist') },
    ],
    packs,
  }
}
