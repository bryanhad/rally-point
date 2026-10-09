import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'

// Keeps an overlay mounted while it animates out. `shown` flips one frame after mounting so
// the enter transition has a starting state to animate from.
export function usePresence(open: boolean, durationMs: number) {
  // `present` keeps the overlay mounted through its exit animation. `mounted` is derived so
  // it is true the instant `open` is, without waiting for a state update.
  const [present, setPresent] = useState(open)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    let inner = 0
    if (open) {
      const outer = requestAnimationFrame(() => {
        setPresent(true)
        inner = requestAnimationFrame(() => setShown(true))
      })
      return () => {
        cancelAnimationFrame(outer)
        cancelAnimationFrame(inner)
      }
    }
    const frame = requestAnimationFrame(() => setShown(false))
    const timer = setTimeout(() => setPresent(false), durationMs)
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(timer)
    }
  }, [open, durationMs])

  return { mounted: open || present, shown: open && shown }
}

export function usePrefersReducedMotion() {
  const query = '(prefers-reduced-motion: reduce)'
  const [reduced, setReduced] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

// Background scroll lock shared by stacked overlays (a dialog over a sheet): only the last
// one to close restores scrolling. The app scrolls inside <main>, so lock that too.
let locks = 0
const saved: { el: HTMLElement; overflow: string }[] = []

export function useScrollLock(active: boolean) {
  useLayoutEffect(() => {
    if (!active) return
    if (locks++ === 0) {
      for (const el of [document.body, document.querySelector('main')]) {
        if (el instanceof HTMLElement) {
          saved.push({ el, overflow: el.style.overflow })
          el.style.overflow = 'hidden'
        }
      }
    }
    return () => {
      if (--locks === 0) {
        for (const { el, overflow } of saved.splice(0)) el.style.overflow = overflow
      }
    }
  }, [active])
}

// Moves focus into the overlay when it opens (to `initial` if given, else the returned ref)
// and back to whatever opened it when it closes. Pass `open && mounted` so the overlay's
// content exists when this runs.
export function useFocusHandoff<T extends HTMLElement>(active: boolean, initial?: RefObject<HTMLElement | null>) {
  const own = useRef<T>(null)
  useEffect(() => {
    if (!active) return
    const previous = document.activeElement as HTMLElement | null
    ;(initial?.current ?? own.current)?.focus({ preventScroll: true })
    return () => previous?.focus?.({ preventScroll: true })
  }, [active, initial])
  return own
}

// Escape closes only the topmost open overlay (e.g. a dialog stacked on a sheet).
const escapeStack: { current: () => void }[] = []
let escapeListening = false

function onEscapeKey(e: KeyboardEvent) {
  if (e.key !== 'Escape' || escapeStack.length === 0) return
  e.preventDefault()
  escapeStack[escapeStack.length - 1].current()
}

export function useEscape(active: boolean, onEscape: () => void) {
  const handler = useRef(onEscape)
  useEffect(() => {
    handler.current = onEscape
  })
  useEffect(() => {
    if (!active) return
    const entry = handler
    escapeStack.push(entry)
    if (!escapeListening) {
      window.addEventListener('keydown', onEscapeKey)
      escapeListening = true
    }
    return () => {
      escapeStack.splice(escapeStack.indexOf(entry), 1)
    }
  }, [active])
}
