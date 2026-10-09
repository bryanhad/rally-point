import { useState } from 'react'
import toast from 'react-hot-toast'
import { BottomSheet } from '../../components/ui/BottomSheet'
import { ConfirmDialog } from '../../components/ui/Dialog'
import { TrashIcon } from '../../components/ui/icons'
import { Button } from '../../components/ui/primitives'
import { useBadminton } from './context'
import { Crown } from './icons'
import type { HistoryEntry } from './schema'

const dayFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' })
const yearDayFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const timeFormat = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' })

// Fallback dots for records saved before team colours were stored.
const NO_COLOR = ['#A4AEC0', '#5A6478']

// "9 Oct · 03:42", with the year added for games from earlier years.
function formatEnded(endedAt: number): string {
  const d = new Date(endedAt)
  const day = d.getFullYear() === new Date().getFullYear() ? dayFormat.format(d) : yearDayFormat.format(d)
  return `${day} · ${timeFormat.format(d)}`
}

type HistorySheetProps = {
  open: boolean
  onClose: () => void
}

// Match history sheet, including the "Clear" confirmation that stacks above it.
export function HistorySheet({ open, onClose }: HistorySheetProps) {
  const { history, clearHistory } = useBadminton()
  const [confirming, setConfirming] = useState(false)
  const entries = history.entries
  const count = entries.length
  const games = `${count} ${count === 1 ? 'game' : 'games'}`
  return (
    <>
    <BottomSheet
      open={open}
      onClose={onClose}
      eyebrow={`Badminton · ${count} ${count === 1 ? 'game' : 'games'}`}
      title="Match history"
      actions={
        count > 0 && (
          <Button tone="danger-soft" icon={<TrashIcon />} label="Clear" onClick={() => setConfirming(true)} />
        )
      }
    >
      {count === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted">No games yet</p>
      ) : (
        <ul className="flex flex-col gap-2.5 px-3 pt-4 pb-[max(20px,env(safe-area-inset-bottom))]">
          {entries.map((entry, i) => (
            <li key={entry.id}>
              <HistoryCard entry={entry} latest={i === 0} />
            </li>
          ))}
        </ul>
      )}
    </BottomSheet>
    <ConfirmDialog
      open={confirming}
      title="Clear match history?"
      description={
        <>
          All <strong className="text-ink">{count} recorded {count === 1 ? 'game' : 'games'}</strong> will be
          deleted. This can&apos;t be undone.
        </>
      }
      confirmLabel={`Clear ${games}`}
      cancelLabel="Keep history"
      onConfirm={() => {
        clearHistory()
        setConfirming(false)
        toast('Match history cleared')
      }}
      onCancel={() => setConfirming(false)}
    />
    </>
  )
}

function HistoryCard({ entry, latest }: { entry: HistoryEntry; latest: boolean }) {
  const mode = entry.left.players.length === 2 ? 'Doubles' : 'Singles'
  const draw = entry.winner === 'draw'
  // Winner first; a draw keeps the left/right order.
  const rows =
    entry.winner === 'right'
      ? [{ side: entry.right, fallback: NO_COLOR[1], won: true }, { side: entry.left, fallback: NO_COLOR[0], won: false }]
      : [
          { side: entry.left, fallback: NO_COLOR[0], won: entry.winner === 'left' },
          { side: entry.right, fallback: NO_COLOR[1], won: false },
        ]

  return (
    <div className="flex flex-col gap-2.5 rounded-card border-[1.5px] border-line px-3.5 py-3">
      <div className="flex items-center justify-between gap-2 text-xs font-bold text-muted">
        <span className="flex items-center gap-1.5">
          {latest && (
            <span className="rounded-full bg-accent-soft px-[7px] py-[3px] text-[10px] font-extrabold tracking-[0.1em] text-band-ink">
              LATEST
            </span>
          )}
          {draw && (
            <span className="rounded-full bg-soft px-[7px] py-[3px] text-[10px] font-extrabold tracking-[0.1em] text-ink-2">
              DRAW
            </span>
          )}
          {formatEnded(entry.endedAt)}
        </span>
        <span>{entry.totalPoints ? `${mode} · to ${entry.totalPoints}` : mode}</span>
      </div>
      {rows.map(({ side, fallback, won }, i) => {
        const strong = won || draw
        return (
          <div key={i} className="flex items-center gap-2.5">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: side.color ?? fallback }} />
            <div
              className={`min-w-0 flex-1 truncate text-[15px] ${strong ? 'font-extrabold text-ink' : 'font-medium text-muted'}`}
            >
              {side.players.map((p) => p.name).join(' & ')}
            </div>
            {won && <Crown className="h-4 w-5" />}
            <div
              className={`w-[30px] text-right text-xl tabular-nums ${strong ? 'font-extrabold text-ink' : 'font-semibold text-subtle'}`}
            >
              {side.score}
            </div>
          </div>
        )
      })}
    </div>
  )
}
