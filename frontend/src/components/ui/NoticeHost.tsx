import { useEffect, useRef, useState, useSyncExternalStore, type PointerEvent, type ReactNode } from 'react'
import { dismissNotice, getNotice, noticeSentence, subscribeNotice, type Notice, type NoticeIcon, type NoticeKind } from '../../lib/notice'
import { RedoIcon, TrashIcon, UndoIcon, UserPlusIcon } from './icons'

// How long a card stays up; every new or merged event restarts it.
const SHOWN_MS = 2200

const TILE: Record<NoticeKind, string> = {
  neutral: 'bg-notice-neutral text-notice-neutral-ink',
  attention: 'bg-notice-attention text-notice-attention-ink',
  destructive: 'bg-notice-destructive text-notice-destructive-ink',
  positive: 'bg-notice-positive text-notice-positive-ink',
}

const ICONS: Record<NoticeIcon, ReactNode> = {
  undo: <UndoIcon size={18} strokeWidth={2.4} />,
  redo: <RedoIcon size={18} strokeWidth={2.4} />,
  'change-ends': <ChangeEndsIcon />,
  trash: <TrashIcon size={18} />,
  'user-plus': <UserPlusIcon size={18} />,
}

// The one notification card, floating over the top of the screen (phone: 16px from the sides;
// tablet: a centred 440px card). Only the card takes taps, so it never blocks the score buttons
// or the court beyond its own box. Motion:
// - first card: drops in (~320ms);
// - a different event while one shows: the old card fades out (~120ms), then the new one fades up;
// - a merge: the card stays and the count badge bumps;
// - leaving (timeout, tap, swipe up): lifts and fades (~280ms).
// Reduced motion: opacity only, no bump. Each phase ends on animationend, so there are no timers
// to keep in step with the CSS.
export function NoticeHost() {
  const notice = useSyncExternalStore(subscribeNotice, getNotice, getNotice)

  // What's drawn: the current card (kept while it leaves), how it arrived, and the card it
  // replaced while that fades out.
  const [shown, setShown] = useState<{ notice: Notice; enter: 'drop' | 'swap'; leaving: boolean } | null>(null)
  const [outgoing, setOutgoing] = useState<Notice | null>(null)
  const [seen, setSeen] = useState<Notice | null>(null)
  if (notice !== seen) {
    setSeen(notice)
    if (!notice) {
      if (shown) setShown({ ...shown, leaving: true })
    } else if (!shown || shown.leaving) {
      setOutgoing(null)
      setShown({ notice, enter: 'drop', leaving: false })
    } else if (shown.notice.id === notice.id) {
      setShown({ ...shown, notice })
    } else {
      setOutgoing(shown.notice)
      setShown({ notice, enter: 'swap', leaving: false })
    }
  }

  // Up for SHOWN_MS after the latest event (a merge is a new object, so it restarts).
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(dismissNotice, SHOWN_MS)
    return () => clearTimeout(timer)
  }, [notice])

  // Tap or swipe up dismisses.
  const start = useRef<number | null>(null)
  const pointer = {
    onPointerDown: (e: PointerEvent) => {
      start.current = e.clientY
    },
    onPointerUp: (e: PointerEvent) => {
      if (start.current === null) return
      const dy = e.clientY - start.current
      start.current = null
      if (dy < -16 || Math.abs(dy) < 8) dismissNotice()
    },
    onPointerCancel: () => {
      start.current = null
    },
  }

  return (
    <div className="pointer-events-none fixed inset-x-4 top-[calc(12px+env(safe-area-inset-top))] z-[60] tablet:inset-x-0 tablet:top-[calc(14px+env(safe-area-inset-top))] tablet:mx-auto tablet:w-[440px]">
      {/* One polite region for screen readers: the card itself is drawn for the eyes only. */}
      <div role="status" aria-live="polite" className="sr-only">
        {notice ? noticeSentence(notice) : ''}
      </div>
      <div className="grid">
        {outgoing && (
          <Card key={`out-${outgoing.id}`} notice={outgoing} className="notice-out" onAnimationEnd={() => setOutgoing(null)} />
        )}
        {shown && (
          <Card
            key={shown.notice.id}
            notice={shown.notice}
            className={shown.leaving ? 'notice-leave' : shown.enter === 'drop' ? 'notice-drop' : 'notice-swap'}
            onAnimationEnd={(e) => {
              if (shown.leaving && e.target === e.currentTarget) setShown(null)
            }}
            {...pointer}
          />
        )}
      </div>
    </div>
  )
}

function Card({
  notice,
  className,
  onAnimationEnd,
  ...pointer
}: {
  notice: Notice
  className: string
  onAnimationEnd: (e: React.AnimationEvent<HTMLDivElement>) => void
  onPointerDown?: (e: PointerEvent) => void
  onPointerUp?: (e: PointerEvent) => void
  onPointerCancel?: () => void
}) {
  return (
    <div
      aria-hidden
      onAnimationEnd={onAnimationEnd}
      {...pointer}
      className={`pointer-events-auto col-start-1 row-start-1 flex cursor-pointer touch-none items-center gap-3 rounded-[18px] bg-notice py-2.5 pr-3 pl-2.5 text-white shadow-[0_12px_30px_rgba(14,18,26,0.35)] select-none ${className}`}
    >
      <span className={`relative flex size-[38px] shrink-0 items-center justify-center rounded-xl ${TILE[notice.kind]}`}>
        {ICONS[notice.icon]}
        {notice.count > 1 && (
          // Keyed by the count, so each merge replays the bump.
          <span
            key={notice.count}
            className="notice-bump absolute -top-1.5 -right-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-white px-[5px] text-[11px] font-black text-ink shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
          >
            {notice.count}
          </span>
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[15px] font-extrabold">{notice.title}</span>
        {notice.subtitle && <span className="truncate text-xs font-semibold text-white/60">{notice.subtitle}</span>}
      </span>
      {notice.score && (
        <span className="flex h-[30px] shrink-0 items-center gap-1 rounded-[9px] bg-white/8 px-2.5 text-[15px] font-black tabular-nums">
          <span style={{ color: notice.score[0].color }}>{notice.score[0].value}</span>
          <span className="font-bold text-white/50">–</span>
          <span style={{ color: notice.score[1].color }}>{notice.score[1].value}</span>
        </span>
      )}
    </div>
  )
}

// ⇄ with arrows on both lines: the automatic change of ends.
function ChangeEndsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 8h16" />
      <path d="M8 4L4 8l4 4" />
      <path d="M20 16H4" />
      <path d="M16 12l4 4-4 4" />
    </svg>
  )
}
