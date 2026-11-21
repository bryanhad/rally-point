import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { usePrefersReducedMotion } from '../../components/ui/overlay'
import type { CourtView } from './schema'

// One motion system for the court: transform/opacity only, one easing family, timings here.
// Every animation is decoration over a state that is already final: scoring never waits for it.
// With reduced motion nothing moves.
export const MOTION = {
  // Card flip between the two views: out to edge-on, then in from the other side.
  flipHalf: 225,
  // The whole flip; the view chip morphs on the same beat.
  flip: 450,
  // Score buttons sliding past each other when they change sides, and the faster reverse (Undo).
  slide: 450,
  slideBack: 250,
  // Point feedback after a scoring tap (flash, shuttle hop, landing, line growth). Toasts that the
  // same point triggers wait for it.
  point: 660,
  // Swap sides: each player's straight move, the gap between one player starting and the next,
  // and Undo's faster reverse (for all four moves together).
  swapEach: 470,
  swapStagger: 125,
  swapBack: 250,
  ease: 'cubic-bezier(0.5, 0, 0.3, 1)',
} as const

export type FlipPhase = 'out' | 'in' | null

type FlipState = { target: CourtView; shown: CourtView; phase: FlipPhase }

// The view the court is drawn in while the flip plays: the old one until the card is edge-on,
// then the new one. Only a change of `view` animates: the first render (and so a reload) starts
// at rest, and a StrictMode re-run of the effect just restarts the same timers. A tap anywhere
// jumps the court to its end (the score buttons don't move with it, so a tap can't land on the
// wrong one).
export function useViewFlip(view: CourtView): { shown: CourtView; phase: FlipPhase } {
  const reduced = usePrefersReducedMotion()
  const [state, setState] = useState<FlipState>({ target: view, shown: view, phase: null })

  // A new view: start the flip from what is drawn now (adjusting state during render, so the
  // first frame already plays it).
  if (state.target !== view) {
    setState(reduced ? { target: view, shown: view, phase: null } : { target: view, shown: state.shown, phase: 'out' })
  }

  const { target, phase } = state
  useEffect(() => {
    if (!phase) return
    const finish = () => setState({ target, shown: target, phase: null })
    const timer =
      phase === 'out'
        ? setTimeout(() => setState({ target, shown: target, phase: 'in' }), MOTION.flipHalf)
        : setTimeout(finish, MOTION.flipHalf)
    // Capture, so it runs before the tap's own handler.
    const skip = () => {
      clearTimeout(timer)
      finish()
    }
    window.addEventListener('pointerdown', skip, { capture: true })
    return () => {
      clearTimeout(timer)
      window.removeEventListener('pointerdown', skip, { capture: true })
    }
  }, [target, phase])

  return { shown: state.shown, phase: state.phase }
}

// Cross-slide: when a row of elements (the score buttons, the tablet score blocks) changes
// order, each one slides from its old place to its new one, past the others. The DOM already
// holds the final order (each element keyed by its team), so a tap during the slide hits the
// element it shows and scores its own team. The distance comes from the layout: the old slot's
// position minus the new one. `onTop` passes over the others; the rest dim and shrink a little
// at the midpoint as they go behind. Reused for Swap sides (step 4), with `duration` shorter for
// the reverse on Undo.
export function useCrossSlide(
  order: readonly string[],
  // `duration` 0: just jump (Redo, Reset). `delay`: wait before sliding (a swap that follows a
  // point's feedback), holding the old places meanwhile.
  { duration, delay = 0, onTop }: { duration: number; delay?: number; onTop: string },
) {
  const reduced = usePrefersReducedMotion()
  const elements = useRef(new Map<string, HTMLElement>())
  const previous = useRef(order)
  const key = order.join('|')

  useLayoutEffect(() => {
    const before = previous.current
    previous.current = order
    if (reduced || duration <= 0 || before.join('|') === key) return
    // Where each slot is now (layout offsets: transforms don't count).
    const slots = order.map((k) => elements.current.get(k)?.offsetLeft ?? 0)
    const animations: Animation[] = []
    for (const k of order) {
      const el = elements.current.get(k)
      const from = before.indexOf(k)
      const to = order.indexOf(k)
      if (!el || from < 0 || from === to) continue
      const dx = slots[from] - slots[to]
      const behind = k !== onTop
      el.style.zIndex = behind ? '1' : '2'
      // Dim relative to the element's own opacity (a disabled button is already faded), and only
      // for the one going behind, so the slide never changes how enabled something looks.
      const base = Number(getComputedStyle(el).opacity) || 1
      const animation = el.animate(
        behind
          ? [
              { transform: `translateX(${dx}px)`, opacity: base },
              { transform: `translateX(${dx / 2}px) scale(0.94)`, opacity: base * 0.6 },
              { transform: 'translateX(0)', opacity: base },
            ]
          : [{ transform: `translateX(${dx}px)` }, { transform: `translateX(${dx / 2}px)` }, { transform: 'translateX(0)' }],
        { duration, delay, easing: MOTION.ease, fill: 'backwards' },
      )
      const done = () => {
        el.style.zIndex = ''
      }
      animation.onfinish = done
      animation.oncancel = done
      animations.push(animation)
    }
    // A new change (or unmounting) lands the running slide at its end.
    return () => animations.forEach((a) => a.cancel())
    // `order` is captured through `key`; duration/delay/onTop are read when the order changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, reduced])

  // Ref callback for the element shown for `k`.
  return useCallback(
    (k: string) => (el: HTMLElement | null) => {
      if (el) elements.current.set(k, el)
      else elements.current.delete(k)
    },
    [],
  )
}

// The deuce ring, the game point half and the game point dot all pulse on ONE clock: a 1.4s
// loop measured from a fixed epoch (page load). Each element's CSS animation gets a negative
// delay equal to how far into the loop "now" is when it mounts, so an indicator that appears
// later joins the beat already running instead of starting its own. Taken once per mount (a
// changing delay would restart the animation on every render).
export const BEAT_MS = 1400

export function useBeatDelay(): string {
  // oxlint-disable-next-line react/purity -- read once at mount, on purpose (see above)
  const [delay] = useState(() => `-${Math.round(performance.now() % BEAT_MS)}ms`)
  return delay
}
