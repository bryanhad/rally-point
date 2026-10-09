import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CloseIcon } from './icons'
import { usePresence, usePrefersReducedMotion, useEscape, useFocusHandoff, useScrollLock } from './overlay'

const DURATION = 300
// Close when released past this share of the sheet's height, or when flicked faster than this.
const CLOSE_DISTANCE = 0.25
const CLOSE_VELOCITY = 0.5 // px per ms

type BottomSheetProps = {
  open: boolean
  onClose: () => void
  title: ReactNode
  // Accessible name, needed when `title` isn't plain text.
  label?: string
  // Small uppercase line above the title (e.g. "BADMINTON").
  eyebrow?: ReactNode
  // Extra header buttons, placed before the close button.
  actions?: ReactNode
  // Optional fixed footer under the scrolling body.
  footer?: ReactNode
  children: ReactNode
}

// Bottom sheet: slides up over a fading overlay, stops at 75% of the viewport, and closes by
// dragging down, the X button, tapping the overlay or Escape — all with the same animation.
export function BottomSheet({ open, onClose, title, label, eyebrow, actions, footer, children }: BottomSheetProps) {
  const { mounted, shown } = usePresence(open, DURATION)
  const reduced = usePrefersReducedMotion()
  useScrollLock(mounted)
  useEscape(open, onClose)
  const sheetRef = useFocusHandoff<HTMLDivElement>(open && mounted)
  const bodyRef = useRef<HTMLDivElement>(null)

  // Drag offset in px while the finger is down; null when not dragging.
  const [drag, setDrag] = useState<number | null>(null)
  const track = useRef<{ startY: number; lastY: number; lastT: number; velocity: number } | null>(null)

  function begin(y: number) {
    track.current = { startY: y, lastY: y, lastT: performance.now(), velocity: 0 }
    setDrag(0)
  }
  function move(y: number) {
    const t = track.current
    if (!t) return
    const now = performance.now()
    t.velocity = (y - t.lastY) / Math.max(1, now - t.lastT)
    t.lastY = y
    t.lastT = now
    // Follow the finger downwards; resist a little when pulled up.
    const dy = y - t.startY
    setDrag(dy > 0 ? dy : dy / 6)
  }
  function end() {
    const t = track.current
    track.current = null
    if (!t) return
    const height = sheetRef.current?.offsetHeight ?? 1
    const dy = t.lastY - t.startY
    setDrag(null)
    if (dy > height * CLOSE_DISTANCE || t.velocity > CLOSE_VELOCITY) onClose()
  }

  // Dragging from the body only starts when its list is scrolled to the top and the finger
  // moves down; otherwise the list scrolls normally.
  useEffect(() => {
    const body = bodyRef.current
    if (!body || !mounted) return
    let startY = 0
    let dragging = false
    const onStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY
      dragging = false
    }
    const onMove = (e: TouchEvent) => {
      const y = e.touches[0].clientY
      if (!dragging && body.scrollTop <= 0 && y - startY > 4) {
        dragging = true
        begin(startY)
      }
      if (dragging) {
        e.preventDefault()
        move(y)
      }
    }
    const onEnd = () => {
      if (dragging) end()
      dragging = false
    }
    body.addEventListener('touchstart', onStart, { passive: true })
    body.addEventListener('touchmove', onMove, { passive: false })
    body.addEventListener('touchend', onEnd)
    body.addEventListener('touchcancel', onEnd)
    return () => {
      body.removeEventListener('touchstart', onStart)
      body.removeEventListener('touchmove', onMove)
      body.removeEventListener('touchend', onEnd)
      body.removeEventListener('touchcancel', onEnd)
    }
    // begin/move/end only touch refs and state setters.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted])

  if (!mounted) return null

  const visible = shown && open
  const transform = reduced
    ? undefined
    : drag !== null
      ? `translateY(${drag}px)`
      : visible
        ? 'translateY(0)'
        : 'translateY(100%)'
  const transition =
    drag !== null ? 'none' : `transform ${DURATION}ms var(--ease-sheet), opacity ${DURATION}ms var(--ease-sheet)`

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        aria-hidden
        onClick={onClose}
        className="absolute inset-0 bg-[var(--overlay-sheet)]"
        style={{ opacity: visible ? 1 : 0, transition: `opacity ${DURATION}ms var(--ease-sheet)` }}
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={label ?? (typeof title === 'string' ? title : undefined)}
        tabIndex={-1}
        className="sheet-max-h relative flex w-full max-w-xl flex-col rounded-t-sheet bg-white outline-none"
        style={{ transform, transition, opacity: reduced ? (visible ? 1 : 0) : 1 }}
      >
        {/* Drag area: handle + header. touch-action none so the browser doesn't scroll instead. */}
        <div
          className="shrink-0 cursor-grab touch-none select-none"
          onPointerDown={(e) => {
            if ((e.target as HTMLElement).closest('button')) return
            e.currentTarget.setPointerCapture(e.pointerId)
            begin(e.clientY)
          }}
          onPointerMove={(e) => track.current && move(e.clientY)}
          onPointerUp={end}
          onPointerCancel={end}
        >
          <div className="flex justify-center pt-2">
            <span className="h-[5px] w-10 rounded-full bg-line-strong" />
          </div>
          <div className="flex items-center justify-between gap-2 pt-2 pr-3 pl-5">
            <div className="flex min-w-0 flex-col gap-0.5">
              {eyebrow && (
                <div className="truncate text-[11px] font-extrabold tracking-[0.22em] text-muted uppercase">
                  {eyebrow}
                </div>
              )}
              <h2 className="truncate text-[22px] font-extrabold">{title}</h2>
            </div>
            <div className="flex shrink-0 gap-1.5">
              {actions}
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="flex size-11 items-center justify-center rounded-control bg-soft text-ink active:opacity-75"
              >
                <CloseIcon />
              </button>
            </div>
          </div>
        </div>
        <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
        {footer && <div className="shrink-0">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
