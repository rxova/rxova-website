/**
 * Every outbound link in PROJECTS resolves.
 *
 * sites.test.ts checks the shape of these URLs, and a well-shaped URL can still
 * 404: ts-extended-errors shipped with an npm link to `@rxova/ts-extended-errors`
 * after the package had been published unscoped as `ts-extended-errors`. Only
 * asking the network catches that, so this file does.
 *
 * npm is checked through the registry, not www.npmjs.com, which answers 403 to
 * anything that is not a browser. The npm link is pinned to the first package
 * below, so checking the packages checks the link.
 */

import { describe, expect, it } from 'vitest'

import { PROJECTS } from './sites.ts'

const TIMEOUT = 15_000

/** Retries what is transient (rate limits, 5xx, network) — never a 404. */
async function status(url: string, method: 'GET' | 'HEAD'): Promise<number> {
  let last = 0
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        method,
        redirect: 'follow',
        signal: AbortSignal.timeout(10_000),
      })
      last = res.status
      if (res.status !== 429 && res.status < 500) return res.status
    } catch {
      last = 0
    }
    await new Promise((r) => setTimeout(r, 1_000 * (attempt + 1)))
  }
  return last
}

/** Off by default, so a flaky registry cannot fail a pull request; the weekly `links` workflow sets it. */
const network = process.env.RX_NETWORK_TESTS === '1'

const registryUrl = (pkg: string) => `https://registry.npmjs.org/${encodeURIComponent(pkg)}`

describe.each(PROJECTS.map((p) => [p.id, p] as const))('%s links', (_, project) => {
  it('links npm to its first package', () => {
    expect(project.npm).toBe(`https://www.npmjs.com/package/${project.packages[0]}`)
  })

  it.runIf(network).each(project.packages)(
    'publishes %s on npm',
    async (pkg) => {
      expect(await status(registryUrl(pkg), 'GET')).toBe(200)
    },
    TIMEOUT * 3,
  )

  it.runIf(network)(
    'has a public GitHub repo',
    async () => {
      expect(await status(project.repo, 'HEAD')).toBe(200)
    },
    TIMEOUT * 3,
  )
})
