import { useId, useState } from 'react'
import { DialogShell } from '../../components/ui/Dialog'
import { CloseIcon } from '../../components/ui/icons'
import { Avatar } from './Avatar'
import { STATUS_COLOR } from './playerList'
import type { Player, Session } from './schema'
import { gameCounts, statusText, type CountRow } from './session'

type GameCountsDialogProps = {
  open: boolean
  onClose: () => void
  session: Session | null
  // Saved players (for current names and colours).
  players: readonly Player[]
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

// How many games each session player has played, fewest first. Information only: the app never
// picks who plays next.
export function GameCountsDialog({ open, onClose, session, players }: GameCountsDialogProps) {
  const titleId = useId()
  // Keep the last session while the card fades out.
  const [shown, setShown] = useState(session)
  if (session && session !== shown) setShown(session)
  const rows = shown ? gameCounts(shown, players) : []

  return (
    <DialogShell open={open} onDismiss={onClose} labelledBy={titleId} className="max-h-full overflow-hidden">
      <div className="flex min-h-0 flex-col">
        <div className="flex shrink-0 items-center justify-between pt-3.5 pr-3 pl-5">
          <div className="flex flex-col gap-0.5">
            <div className="text-[11px] font-extrabold tracking-[0.22em] text-muted">
              SESSION · {plural(shown?.games.length ?? 0, 'game').toUpperCase()}
            </div>
            <h2 id={titleId} className="text-xl font-extrabold">
              Game counts
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex size-11 items-center justify-center rounded-control bg-soft text-ink active:opacity-75"
          >
            <CloseIcon />
          </button>
        </div>
        <p className="shrink-0 px-5 pt-1 text-[13px] text-subtle">Fewest games first · ties A–Z</p>

        <ol className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-4">
          {rows.map((row) => (
            <CountListItem key={row.player.id} row={row} />
          ))}
        </ol>
      </div>
    </DialogShell>
  )
}

// One player's line: avatar, name (+ LEFT), status, and their game count.
export function CountListItem({ row }: { row: CountRow }) {
  const { player, games, left } = row
  const status = statusText(row)
  return (
    <li
      aria-label={`${player.name}, ${plural(games, 'game')}, ${status.toLowerCase()}${left ? ', left the session' : ''}`}
      className={`flex items-center gap-3 border-b border-soft px-2 py-2.5 ${left ? 'opacity-55' : ''}`}
    >
      <Avatar player={player} size={40} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5" aria-hidden>
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-[15px] font-bold">{player.name}</span>
          {left && (
            <span className="flex h-[18px] shrink-0 items-center rounded-full bg-line px-[7px] text-[10px] font-extrabold tracking-[0.08em] text-ink-2">
              LEFT
            </span>
          )}
        </div>
        <div className={`text-xs font-semibold ${STATUS_COLOR[row.status]}`}>{status}</div>
      </div>
      <div className="shrink-0 text-[15px] font-extrabold whitespace-nowrap tabular-nums" aria-hidden>
        {games} <span className="text-xs font-semibold text-muted">{games === 1 ? 'game' : 'games'}</span>
      </div>
    </li>
  )
}
