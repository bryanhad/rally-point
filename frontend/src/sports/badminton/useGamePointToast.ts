import { useCallback, useEffect, useRef, useState } from 'react'
import type { TeamId } from './schema'

// The game point toast's life: shown by a scoring tap only (never on Undo/Redo/Reset/reload),
// up for ~3s, then a short exit. A new one replaces the old (a new id restarts the sequence).
export type GamePointToastState = { team: TeamId; id: number; leaving: boolean }

const SHOWN_MS = 3000
export const EXIT_MS = 250

export function useGamePointToast() {
  const [toast, setToast] = useState<GamePointToastState | null>(null)
  const nextId = useRef(0)

  // Each phase has one timer, cleared when the toast changes or the scoreboard unmounts (and on
  // StrictMode's dev re-run, which then sets it again).
  useEffect(() => {
    if (!toast) return
    const { id, leaving } = toast
    const timer = setTimeout(
      () => setToast((t) => (t?.id !== id ? t : leaving ? null : { ...t, leaving: true })),
      leaving ? EXIT_MS : SHOWN_MS,
    )
    return () => clearTimeout(timer)
  }, [toast])

  // Called from the score button's click handler.
  const show = useCallback((team: TeamId) => {
    nextId.current += 1
    setToast({ team, id: nextId.current, leaving: false })
    // A short buzz where supported (Android); iOS Safari has no vibrate.
    try {
      if (typeof navigator.vibrate === 'function') navigator.vibrate([30, 40, 70])
    } catch {
      // never mind
    }
  }, [])

  // Plays the exit (e.g. the other team scored).
  const dismiss = useCallback(() => setToast((t) => (t && !t.leaving ? { ...t, leaving: true } : t)), [])

  // Gone at once (Undo/Redo/Reset): a Redo back onto game point must not bring the toast back.
  const clear = useCallback(() => setToast(null), [])

  return { toast, show, dismiss, clear }
}
