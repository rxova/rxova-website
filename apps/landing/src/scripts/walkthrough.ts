/** Turns each `[data-walkthrough]` into the guided tour. The timing rules live in ../lib/walkthrough.ts. */
import { PLAY_LABELS, stepAt, stepCount, timeline, type PlayState } from '../lib/walkthrough'

interface Step {
  side: string
  index: number
  html: string
  lines: HTMLElement[]
  box: HTMLElement
}

export function enhanceWalkthroughs(): void {
  for (const root of document.querySelectorAll<HTMLElement>('[data-walkthrough]')) {
    // Once per element: a dev hot reload can run this again over the same page.
    if (root.dataset.js === undefined) enhance(root)
  }
}

function enhance(root: HTMLElement): void {
  const q = <T extends Element>(selector: string) => root.querySelector<T>(selector)
  const bar = q<HTMLElement>('[data-bar]')
  const caption = q<HTMLElement>('[data-caption]')
  const captionNumber = q<HTMLElement>('[data-caption-number]')
  const captionText = q<HTMLElement>('[data-caption-text]')
  const count = q<HTMLElement>('[data-count]')
  const prev = q<HTMLButtonElement>('[data-prev]')
  const next = q<HTMLButtonElement>('[data-next]')
  const play = q<HTMLButtonElement>('[data-play]')
  const playLabel = q<HTMLElement>('[data-play-label]')
  const progress = q<HTMLElement>('[data-progress]')
  const scrubber = q<HTMLInputElement>('[data-scrubber]')
  const tabs = [...root.querySelectorAll<HTMLButtonElement>('[data-show]')]
  const panes = [...root.querySelectorAll<HTMLElement>('[data-pane]')]
  if (
    !bar ||
    !caption ||
    !captionNumber ||
    !captionText ||
    !count ||
    !prev ||
    !next ||
    !play ||
    !playLabel ||
    !progress ||
    !scrubber
  ) {
    return
  }

  // One step per note per side: every problem, then every fix. Expressive Code writes a marker's
  // label into its line's `--tmLabel`, which is how a note finds its lines.
  const steps: Step[] = panes.flatMap((pane) => {
    const box = pane.querySelector<HTMLElement>('[data-code]')
    if (!box) return []
    const lines = [...pane.querySelectorAll<HTMLElement>('.ec-line')]
    const labelOf = (line: HTMLElement) =>
      line.style.getPropertyValue('--tmLabel').replace(/\D/g, '')
    return [...pane.querySelectorAll<HTMLElement>('[data-note]')].map((note, index) => {
      const part = lines.filter((line) => labelOf(line) === String(index + 1))
      for (const line of part) line.classList.add('part')
      return { side: pane.dataset.pane ?? '', index, html: note.innerHTML, lines: part, box }
    })
  })
  const total = steps.filter((step) => step.side === 'before').length
  if (steps.length === 0) return

  const { starts, end } = timeline(steps.map((step) => step.side))
  scrubber.max = String(end)

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  let state: PlayState = 'paused'
  let time = 0
  let frame: number | undefined
  let last = 0
  let current = -1
  let started = false
  let pausedByPage = false

  // Scrolls the code box, never the page, to put a step's first line near its top.
  const reveal = (step: Step) => {
    const [first] = step.lines
    if (!first) return
    const top = first.offsetTop - step.box.clientHeight / 5
    step.box.scrollTo({ top: Math.max(0, top), behavior: reduced ? 'auto' : 'smooth' })
  }

  const apply = (index: number) => {
    const step = steps[index]
    if (!step || index === current) return
    current = index
    root.dataset.show = step.side
    for (const tab of tabs) {
      tab.setAttribute('aria-pressed', String(tab.dataset.show === step.side))
    }
    for (const pane of panes) pane.inert = pane.dataset.pane !== step.side
    for (const [i, other] of steps.entries()) {
      for (const line of other.lines) line.classList.toggle('lit', i === index)
    }
    caption.dataset.side = step.side
    captionNumber.textContent = String(step.index + 1)
    captionText.innerHTML = step.html
    count.textContent = stepCount(step.side, step.index, total)
    prev.disabled = index === 0
    next.disabled = index === steps.length - 1
    // Retriggers the caption's fade, so the new text arrives rather than replaces.
    caption.classList.remove('enter')
    void caption.offsetWidth
    caption.classList.add('enter')
    reveal(step)
  }

  const draw = () => {
    apply(stepAt(starts, time))
    scrubber.value = String(time)
    progress.style.setProperty('--progress', `${String((time / end) * 100)}%`)
    scrubber.setAttribute('aria-valuetext', count.textContent ?? '')
  }

  const setState = (nextState: PlayState) => {
    state = nextState
    play.dataset.state = nextState
    playLabel.textContent = PLAY_LABELS[nextState]
  }

  const stop = () => {
    if (frame !== undefined) cancelAnimationFrame(frame)
    frame = undefined
  }

  const tick = (now: number) => {
    time = Math.min(end, time + (now - last))
    last = now
    draw()
    if (time >= end) {
      stop()
      setState('ended')
      return
    }
    frame = requestAnimationFrame(tick)
  }

  const resume = () => {
    if (time >= end) time = 0
    setState('playing')
    last = performance.now()
    stop()
    frame = requestAnimationFrame(tick)
  }

  const pause = () => {
    stop()
    if (state === 'playing') setState('paused')
  }

  // Taking over (a step, a tab, a drag) stops the tour where the reader put it.
  const goTo = (index: number) => {
    pause()
    const target = Math.max(0, Math.min(steps.length - 1, index))
    time = starts[target] ?? 0
    draw()
    if (target === steps.length - 1) setState('ended')
  }

  // The JS layout: the bar and the caption come in, the note lists go.
  root.dataset.js = ''
  bar.hidden = false
  caption.hidden = false
  setState('paused')
  draw()

  play.addEventListener('click', () => {
    if (state === 'playing') pause()
    else resume()
  })
  prev.addEventListener('click', () => {
    goTo(current - 1)
  })
  next.addEventListener('click', () => {
    goTo(current + 1)
  })
  for (const tab of tabs) {
    tab.addEventListener('click', () => {
      goTo(steps.findIndex((step) => step.side === tab.dataset.show))
    })
  }
  scrubber.addEventListener('input', () => {
    pause()
    time = Number(scrubber.value)
    draw()
    setState(time >= end ? 'ended' : 'paused')
  })

  // Reading the code by hand is taking over too.
  for (const step of steps) {
    for (const type of ['wheel', 'touchstart'] as const) {
      step.box.addEventListener(type, pause, { passive: true })
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state === 'playing') {
      pausedByPage = true
      pause()
    } else if (!document.hidden && pausedByPage) {
      pausedByPage = false
      resume()
    }
  })

  // With a host, the tour plays only while the host is active and the tour is in view; hidden hosts
  // still take up layout, so the observer alone would start every tour at once.
  const host = root.dataset.host ? root.closest<HTMLElement>(root.dataset.host) : null
  const hostShowing = () => !host || host.classList.contains('is-active')
  let inView = false

  const update = () => {
    if (!hostShowing()) {
      pause()
      return
    }
    if (inView && !started && !reduced) {
      started = true
      resume()
    }
  }

  new IntersectionObserver(
    (entries) => {
      inView = entries.some((entry) => entry.isIntersecting)
      update()
    },
    // Most of the window on screen first, so the first note is not spent while scrolling to it.
    { threshold: 0.6 },
  ).observe(root)

  if (host) {
    new MutationObserver(update).observe(host, { attributes: true, attributeFilter: ['class'] })
  }
}
