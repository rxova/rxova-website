/**
 * Renders the 1200x630 social cards for every rxova.org surface.
 *
 * These are generated rather than hand-designed so they cannot drift from the
 * brand: the colours come from tokens.css and the taglines from sites.ts, so a
 * palette change or a reworded tagline is one `pnpm run og` away from being
 * correct everywhere, and a new project gets a card for free.
 *
 * Output is committed — consumers install this package and read the PNGs
 * directly, so nothing downstream needs a render step.
 *
 * Usage: pnpm run og [--check]
 *   --check  fail if the committed cards are stale (CI).
 *
 * `--check` compares a hash of the *inputs* — the palette, the taglines, this
 * script — against a committed manifest, rather than re-rendering and diffing
 * the PNGs. resvg ships per-platform native builds and font rasterisation is
 * not guaranteed byte-identical across them, so an output diff would fail on
 * CI for cards that are perfectly correct.
 */

import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const checkOnly = process.argv.includes('--check')

const WIDTH = 1200
const HEIGHT = 630

// Read the palette straight out of tokens.css rather than restating it here —
// a second copy of the brand colours is a second thing to forget to update.
const tokens = readFileSync(join(repoRoot, 'src/tokens.css'), 'utf8')
const darkBlock = tokens.slice(tokens.indexOf(":root[data-theme='dark']"))
const token = (name, source = darkBlock) => {
  const match = source.match(new RegExp(`--${name}:\\s*([^;]+);`))
  if (!match) throw new Error(`token --${name} not found in tokens.css`)
  return match[1].trim()
}

const BG = token('rx-bg')
const FG = token('rx-fg')
const MUTED = token('rx-muted')
const [ACCENT_A, ACCENT_B, ACCENT_C] = ['rx-accent-a', 'rx-accent-b', 'rx-accent-c'].map((n) =>
  token(n, tokens),
)

const font = (weight) =>
  readFileSync(
    join(
      repoRoot,
      `node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-${weight}-normal.woff`,
    ),
  )

const markDataUri = `data:image/png;base64,${readFileSync(join(repoRoot, 'assets/rxova-logo-256.png')).toString('base64')}`

/** The card. Satori takes React-element-shaped objects; no JSX in a plain .ts script. */
const card = ({ title, tagline }) => ({
  type: 'div',
  props: {
    style: {
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      background: BG,
      padding: '72px 80px',
      fontFamily: 'Space Grotesk',
    },
    children: [
      {
        type: 'div',
        props: {
          style: { display: 'flex', alignItems: 'center', gap: 20 },
          children: [
            { type: 'img', props: { src: markDataUri, width: 64, height: 64 } },
            {
              type: 'div',
              props: { style: { fontSize: 34, color: MUTED, fontWeight: 400 }, children: 'Rxova' },
            },
          ],
        },
      },
      {
        type: 'div',
        props: {
          style: { display: 'flex', flexDirection: 'column', gap: 24 },
          children: [
            {
              type: 'div',
              props: {
                style: { fontSize: 76, color: FG, fontWeight: 700, letterSpacing: '-0.03em' },
                children: title,
              },
            },
            {
              type: 'div',
              props: {
                style: { fontSize: 34, color: MUTED, lineHeight: 1.35, maxWidth: 900 },
                children: tagline,
              },
            },
          ],
        },
      },
      // The gradient is the brand's only chroma; on the card it earns one rule.
      {
        type: 'div',
        props: {
          style: {
            height: 10,
            borderRadius: 5,
            background: `linear-gradient(90deg, ${ACCENT_A}, ${ACCENT_B}, ${ACCENT_C})`,
          },
        },
      },
    ],
  },
})

async function render(spec) {
  const svg = await satori(card(spec), {
    width: WIDTH,
    height: HEIGHT,
    fonts: [
      { name: 'Space Grotesk', data: font(400), weight: 400, style: 'normal' },
      { name: 'Space Grotesk', data: font(700), weight: 700, style: 'normal' },
    ],
  })
  return new Resvg(svg, { fitTo: { mode: 'width', value: WIDTH } }).render().asPng()
}

// Imported dynamically: sites.ts is TypeScript, and Node strips the types.
const { PROJECTS } = await import('../src/sites.ts')

const cards = [
  {
    // The file name is the id, so it stays lower-case like every other path
    // here; the title is the brand name as it is written.
    file: 'rxova.png',
    title: 'Rxova',
    // The umbrella card is the only tagline written here; the rest come from
    // PROJECTS. It said "Open-source React libraries — each does one thing
    // well", which was both a claim the card cannot support and wrong about
    // scope — see SiteFooter's blurb for the same correction.
    tagline: 'Small TypeScript libraries and developer tools.',
  },
  ...PROJECTS.map((p) => ({ file: `${p.id}.png`, title: p.label, tagline: p.tagline })),
]

const manifestPath = join(repoRoot, 'scripts/og-manifest.json')
const fingerprint = createHash('sha256')
  .update(tokens)
  .update(readFileSync(join(repoRoot, 'scripts/generate-og.ts')))
  .update(JSON.stringify(cards))
  .digest('hex')

if (checkOnly) {
  const missing = cards.filter((c) => !existsSync(join(repoRoot, 'assets/og', c.file)))
  if (missing.length > 0) {
    console.error(`Missing social cards: ${missing.map((c) => c.file).join(', ')}`)
    process.exit(1)
  }

  const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {}
  if (manifest.fingerprint !== fingerprint) {
    console.error(
      'Social cards are stale — the palette, a tagline, the project list or this\n' +
        'script changed since they were last rendered.\nRun `pnpm run og` and commit.',
    )
    process.exit(1)
  }

  console.log(`✓ all ${cards.length} social cards are up to date`)
} else {
  for (const spec of cards) {
    writeFileSync(join(repoRoot, 'assets/og', spec.file), await render(spec))
    console.log(`✓ assets/og/${spec.file}`)
  }
  writeFileSync(manifestPath, `${JSON.stringify({ fingerprint, cards }, null, 2)}\n`)
}
