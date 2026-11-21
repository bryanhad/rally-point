import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CloseIcon } from './icons'
import {
  TABLET_LANDSCAPE,
  useEscape,
  useFocusHandoff,
  useMediaQuery,
  usePresence,
  usePrefersReducedMotion,
  useScrollLock,
} from './overlay'

const DURATION = 300
// Close when released past this share of the sheet's size, or when flicked faster than this.
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
  // Optional row under the title (e.g. who's being replaced). Aligns the close button to the top.
  subtitle?: ReactNode
  // Extra header buttons, placed before the close button.
  actions?: ReactNode
  // Fixed content under the title that doesn't scroll (e.g. a filter or an Add button). The
  // header gets a bottom border when it's set.
  subheader?: ReactNode
  // White gradient over the bottom of the scrolling body, so long lists fade out.
  fade?: boolean
  // Optional fixed footer under the scrolling body.
  footer?: ReactNode
  // Opens taller: near the top of the screen on phones (40px gap), 88% in tablet portrait.
  tall?: boolean
  // false: no border under the subheader (it flows into the body, e.g. a card and a heading).
  subheaderBorder?: boolean
  children: ReactNode
}

// Bottom sheet: slides up over a fading overlay at a fixed height whatever the content (75% of
// the viewport on phones; 680px wide and 72% tall in tablet portrait), and closes by dragging
// down, the X button, tapping the overlay or Escape, all with the same animation. In tablet
// landscape it's a 460px side sheet on the right edge instead: full height, slides in from the
// right and closes with a swipe right.
export function BottomSheet({
  open,
  onClose,
  title,
  label,
  eyebrow,
  subtitle,
  actions,
  subheader,
  fade,
  footer,
  tall = false,
  subheaderBorder = true,
  children,
}: BottomSheetProps) {
  const { mounted, shown } = usePresence(open, DURATION)
  const reduced = usePrefersReducedMotion()
  useScrollLock(mounted)
  useEscape(open, onClose)
  const sheetRef = useFocusHandoff<HTMLDivElement>(open && mounted)
  const bodyRef = useRef<HTMLDivElement>(null)
  // Side sheet: moves and drags along x (towards the right edge) instead of y (down).
  const side = useMediaQuery(TABLET_LANDSCAPE)
  const sideRef = useRef(side)
  useEffect(() => {
    sideRef.current = side
  }, [side])

  // Drag offset in px along the closing axis (down, or right for the side sheet) while the finger
  // is down; null when not dragging.
  const [drag, setDrag] = useState<number | null>(null)
  const track = useRef<{ start: number; last: number; lastT: number; velocity: number } | null>(null)
  // The pointer coordinate on the closing axis.
  const along = (x: number, y: number) => (sideRef.current ? x : y)

  function begin(at: number) {
    track.current = { start: at, last: at, lastT: performance.now(), velocity: 0 }
    setDrag(0)
  }
  function move(at: number) {
    const t = track.current
    if (!t) return
    const now = performance.now()
    t.velocity = (at - t.last) / Math.max(1, now - t.lastT)
    t.last = at
    t.lastT = now
    // Follow the finger towards closing; resist a little the other way.
    const d = at - t.start
    setDrag(d > 0 ? d : d / 6)
  }
  function end() {
    const t = track.current
    track.current = null
    if (!t) return
    const el = sheetRef.current
    const size = (sideRef.current ? el?.offsetWidth : el?.offsetHeight) ?? 1
    const d = t.last - t.start
    setDrag(null)
    if (d > size * CLOSE_DISTANCE || t.velocity > CLOSE_VELOCITY) onClose()
  }

  // Dragging from the body only starts when the finger moves the closing way: down with the list
  // scrolled to the top, or (side sheet) mostly to the right. Otherwise the list scrolls normally.
  useEffect(() => {
    const body = bodyRef.current
    if (!body || !mounted) return
    let startX = 0
    let startY = 0
    let dragging = false
    const onStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
      dragging = false
    }
    const onMove = (e: TouchEvent) => {
      const { clientX: x, clientY: y } = e.touches[0]
      const dx = x - startX
      const dy = y - startY
      const closing = sideRef.current ? dx > 4 && dx > Math.abs(dy) : body.scrollTop <= 0 && dy > 4
      if (!dragging && closing) {
        dragging = true
        begin(along(startX, startY))
      }
      if (dragging) {
        e.preventDefault()
        move(along(x, y))
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
  const axis = side ? 'translateX' : 'translateY'
  const transform = reduced
    ? undefined
    : drag !== null
      ? `${axis}(${drag}px)`
      : visible
        ? `${axis}(0)`
        : `${axis}(100%)`
  // Drag from the handle, header or the side sheet's grab bar (buttons excepted).
  const dragHandlers = {
    onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest('button')) return
      e.currentTarget.setPointerCapture(e.pointerId)
      begin(along(e.clientX, e.clientY))
    },
    onPointerMove: (e: PointerEvent<HTMLDivElement>) => track.current && move(along(e.clientX, e.clientY)),
    onPointerUp: end,
    onPointerCancel: end,
  }
  const transition =
    drag !== null ? 'none' : `transform ${DURATION}ms var(--ease-sheet), opacity ${DURATION}ms var(--ease-sheet)`

  return createPortal(
    // Same z-index as dialogs: whichever opened last is on top (see DialogShell).
    <div className="fixed inset-0 z-50 flex items-end justify-center tablet-landscape:items-stretch tablet-landscape:justify-end">
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
        className={`sheet-h ${tall ? 'sheet-h-tall' : ''} relative flex w-full flex-col rounded-t-sheet bg-white outline-none tablet-portrait:w-[680px] tablet-portrait:max-w-full tablet-landscape:w-[460px] tablet-landscape:max-w-full tablet-landscape:rounded-tr-none tablet-landscape:rounded-bl-sheet tablet-landscape:pt-4 tablet-landscape:pr-[env(safe-area-inset-right)] tablet-landscape:shadow-[-12px_0_40px_rgba(14,18,26,0.25)]`}
        style={{ transform, transition, opacity: reduced ? (visible ? 1 : 0) : 1 }}
      >
        {/* Side sheet: a short vertical grab bar on the left edge, in place of the top handle. */}
        <div
          aria-hidden
          className="absolute inset-y-0 left-0 z-[1] hidden w-5 cursor-grab touch-none items-center justify-center select-none tablet-landscape:flex"
          {...dragHandlers}
        >
          <span className="h-10 w-[5px] rounded-full bg-line-strong" />
        </div>
        {/* Drag area: handle + header. touch-action none so the browser doesn't scroll instead. */}
        <div className="shrink-0 cursor-grab touch-none select-none" {...dragHandlers}>
          <div className="flex justify-center pt-2 tablet-landscape:hidden">
            <span className="h-[5px] w-10 rounded-full bg-line-strong" />
          </div>
          <div
            className={`flex justify-between gap-2 pt-2 pr-3 pl-5 ${subtitle ? 'items-start' : 'items-center'}`}
          >
            <div className={`flex min-w-0 flex-col ${subtitle ? 'gap-1' : 'gap-0.5'}`}>
              {eyebrow && (
                <div className="truncate text-[11px] font-extrabold tracking-[0.22em] text-muted uppercase">
                  {eyebrow}
                </div>
              )}
              <h2 className="truncate text-[22px] font-extrabold">{title}</h2>
              {subtitle && <div className="mt-1.5 min-w-0">{subtitle}</div>}
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
        {subheader && <div className={`shrink-0 ${subheaderBorder ? 'border-b border-soft pb-3' : ''}`}>{subheader}</div>}
        <div className="relative flex min-h-0 flex-1 flex-col">
          <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {children}
          </div>
          {fade && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-b from-white/0 to-white"
            />
          )}
        </div>
        {footer && <div className="shrink-0">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
