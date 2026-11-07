import { useId, useState } from 'react'
import { DialogShell } from '../../components/ui/Dialog'
import { CloseIcon } from '../../components/ui/icons'
import { sortByName } from './game'
import { NewPlayerDialog } from './NewPlayerDialog'
import { FindPlayerInput, NewPlayerTile, NoMatch, SelectTile } from './PlayerGrid'
import { filterPlayers, MIN_PLAYERS } from './playerList'
import type { Config, Player, Session } from './schema'

type SessionPlayersDialogProps = {
  open: boolean
  onClose: () => void
  session: Session | null
  // Saved players.
  players: Player[]
  // Players on court right now: they can't be removed.
  onCourt: readonly string[]
  // The live mode: the session can't drop below its minimum.
  mode: Config['mode']
  // "Done": who's in the session now.
  onSave: (playerIds: string[]) => void
  // Saves a new player and returns their id (they come back selected).
  onCreatePlayer: (name: string) => string
}

// Who's in the running session: add late arrivals, untick people who leave. A draft until
// "Done"; closing discards it.
export function SessionPlayersDialog({ open, onClose, session, ...rest }: SessionPlayersDialogProps) {
  const titleId = useId()
  // Keep the last session while the card fades out.
  const [shown, setShown] = useState(session)
  if (session && session !== shown) setShown(session)
  return (
    <DialogShell open={open} onDismiss={onClose} labelledBy={titleId} className="max-h-full overflow-hidden">
      {shown && <SessionPlayersForm {...rest} session={shown} titleId={titleId} onClose={onClose} />}
    </DialogShell>
  )
}

function SessionPlayersForm({
  titleId,
  onClose,
  session,
  players,
  onCourt,
  mode,
  onSave,
  onCreatePlayer,
}: Omit<SessionPlayersDialogProps, 'open' | 'session'> & { session: Session; titleId: string }) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set(session.playerIds))
  // Fixed when the popup opens (session players first, then A–Z), so tiles don't move while
  // tapping; new players go first.
  const [order, setOrder] = useState(() => {
    const sorted = sortByName(players)
    const inSession = new Set(session.playerIds)
    return [...sorted.filter((p) => inSession.has(p.id)), ...sorted.filter((p) => !inSession.has(p.id))].map((p) => p.id)
  })
  const [query, setQuery] = useState('')
  const [adding, setAdding] = useState(false)

  const byId = new Map(players.map((p) => [p.id, p]))
  const ordered = order.map((id) => byId.get(id)).filter((p): p is Player => !!p)
  const shown = filterPlayers(ordered, query)
  const count = ordered.filter((p) => selected.has(p.id)).length
  const min = MIN_PLAYERS[mode]
  const atMinimum = count <= min

  // Why a selected player can't be unticked, if they can't.
  function lockFor(id: string): string | undefined {
    if (!selected.has(id)) return undefined
    if (onCourt.includes(id)) return 'On court'
    if (atMinimum) return `Needed for ${mode}`
    return undefined
  }

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between pt-3.5 pr-3 pl-5">
        <div className="flex flex-col gap-0.5">
          <div className="text-[11px] font-extrabold tracking-[0.22em] text-muted">SESSION · {count} SELECTED</div>
          <h2 id={titleId} className="text-xl font-extrabold">
            Session players
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

      <div className="shrink-0 px-4 pt-3 pb-1">
        <FindPlayerInput value={query} onChange={setQuery} />
      </div>

      {/* Capped height; shrinks on short screens. */}
      <div className="relative mt-1 flex min-h-[132px] flex-[0_1_470px] flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div role="group" aria-label="Players in this session" className="grid grid-cols-3 gap-x-1.5 gap-y-1 px-3 pt-1.5 pb-6">
            <NewPlayerTile size="sm" onClick={() => setAdding(true)} />
            {shown.map((p) => (
              <SelectTile
                key={p.id}
                player={p}
                selected={selected.has(p.id)}
                lockedNote={lockFor(p.id)}
                onToggle={() => toggle(p.id)}
              />
            ))}
          </div>
          {shown.length === 0 && query.trim() && <NoMatch query={query} />}
        </div>
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-b from-white/0 to-white" />
      </div>

      <div className="shrink-0 border-t border-soft px-4 pt-3 pb-[18px]">
        <button
          type="button"
          onClick={() => onSave(ordered.filter((p) => selected.has(p.id)).map((p) => p.id))}
          className="h-[50px] w-full rounded-[14px] bg-band text-[15px] font-extrabold text-white active:opacity-80"
        >
          Done
        </button>
      </div>

      <NewPlayerDialog
        open={adding}
        onClose={() => setAdding(false)}
        players={players}
        initialName={query.trim()}
        primaryLabel="Add player"
        onPrimary={(name) => {
          const id = onCreatePlayer(name)
          setOrder((o) => [id, ...o])
          setSelected((s) => new Set(s).add(id))
          setQuery('')
          setAdding(false)
        }}
      />
    </div>
  )
}
