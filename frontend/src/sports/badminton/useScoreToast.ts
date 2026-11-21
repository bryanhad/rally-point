import { useCallback, useEffect, useRef, useState } from 'react'
import type { TeamId } from './schema'

// The score toast's life: GAME POINT (a lead) or DEUCE (a tie in deuce). Shown by a scoring tap
// only (never on Undo/Redo/Reset/reload), up for ~3s, then a short exit. One slot: a new toast
// replaces the showing one (a new id restarts the sequence), so they never stack.
export type ScoreToastKind = { kind: 'game-point'; team: TeamId } | { kind: 'deuce' }
export type ScoreToastState = ScoreToastKind & { id: number; leaving: boolean }

const SHOWN_MS = 3000
export const EXIT_MS = 250

export function useScoreToast() {
  const [toast, setToast] = useState<ScoreToastState | null>(null)
  const nextId = useRef(0)
  // A toast waiting for the point feedback to finish (the feedback plays first).
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelPending = () => {
    if (pending.current) clearTimeout(pending.current)
    pending.current = null
  }
  useEffect(() => cancelPending, [])

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

  // Called from the score button's click handler, after `delay` ms (the point feedback).
  const show = useCallback((kind: ScoreToastKind, delay = 0) => {
    cancelPending()
    const appear = () => {
      pending.current = null
      nextId.current += 1
      setToast({ ...kind, id: nextId.current, leaving: false })
      // A short buzz where supported (Android); iOS Safari has no vibrate.
      try {
        if (typeof navigator.vibrate === 'function') navigator.vibrate([30, 40, 70])
      } catch {
        // never mind
      }
    }
    if (delay > 0) pending.current = setTimeout(appear, delay)
    else appear()
  }, [])

  // Plays the exit (e.g. the point went on without a new announcement).
  const dismiss = useCallback(() => {
    cancelPending()
    setToast((t) => (t && !t.leaving ? { ...t, leaving: true } : t))
  }, [])

  // Gone at once (Undo/Redo/Reset): a Redo back onto game point or deuce must not bring it back.
  const clear = useCallback(() => {
    cancelPending()
    setToast(null)
  }, [])

  return { toast, show, dismiss, clear }
}
