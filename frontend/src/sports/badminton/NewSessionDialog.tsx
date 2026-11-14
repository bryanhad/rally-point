import { useId, useRef, useState } from 'react'
import { ConfirmDialog, DialogShell } from '../../components/ui/Dialog'
import { ClockIcon, CloseIcon, FlagIcon } from '../../components/ui/icons'
import { dayLabel, sessionDateLabel } from './session'
import { sortByName } from './game'
import { Racket, Rackets } from './icons'
import { NewPlayerDialog } from './NewPlayerDialog'
import { FindPlayerInput, NewPlayerTile, NoMatch, SelectTile } from './PlayerGrid'
import { filterPlayers, MIN_PLAYERS } from './playerList'
import type { Config, Player, Session } from './schema'

export type NewSession = { startedAt: number; mode: Config['mode']; playerIds: string[] }

type NewSessionDialogProps = {
  open: boolean
  onClose: () => void
  // Saved players.
  players: Player[]
  // The running session, if any: starting a new one ends it (after a confirmation).
  current: Session | null
  // Preselected starting mode.
  mode: Config['mode']
  onStart: (session: NewSession) => void
  // Saves a new player and returns their id (they come back selected).
  onCreatePlayer: (name: string) => string
}

// New session: when it starts, the starting mode and who's playing. Nothing happens until
// "Start session"; closing discards the draft.
export function NewSessionDialog({ open, onClose, ...rest }: NewSessionDialogProps) {
  const titleId = useId()
  return (
    <DialogShell open={open} onDismiss={onClose} labelledBy={titleId} width="max-w-sm tablet:max-w-[560px]" className="max-h-full overflow-hidden">
      {/* The shell unmounts its content once closed, so each opening starts a fresh draft. */}
      <NewSessionForm {...rest} titleId={titleId} onClose={onClose} />
    </DialogShell>
  )
}

// "2026-11-07T19:00" in local time, for the native date-time picker.
function localInputValue(at: number) {
  const d = new Date(at)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

function NewSessionForm({
  titleId,
  onClose,
  players,
  current,
  mode: initialMode,
  onStart,
  onCreatePlayer,
}: Omit<NewSessionDialogProps, 'open'> & { titleId: string }) {
  // null = "Now": the time Start is pressed.
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [mode, setMode] = useState(initialMode)
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  // Fixed when the popup opens (A–Z), so tiles don't move while tapping; new players go first.
  const [order, setOrder] = useState(() => sortByName(players).map((p) => p.id))
  const [query, setQuery] = useState('')
  const [adding, setAdding] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const pickerRef = useRef<HTMLInputElement>(null)

  const byId = new Map(players.map((p) => [p.id, p]))
  const ordered = order.map((id) => byId.get(id)).filter((p): p is Player => !!p)
  const shown = filterPlayers(ordered, query)
  const count = [...selected].filter((id) => byId.has(id)).length
  const min = MIN_PLAYERS[mode]
  const canStart = count >= min

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function openPicker() {
    const input = pickerRef.current
    if (!input) return
    input.value = localInputValue(startedAt ?? Date.now())
    try {
      input.showPicker()
    } catch {
      input.focus()
    }
  }

  function start() {
    // oxlint-disable-next-line react/purity -- only called from a click handler, not during render
    onStart({ startedAt: startedAt ?? Date.now(), mode, playerIds: ordered.filter((p) => selected.has(p.id)).map((p) => p.id) })
  }

  // "tonight's" only for a session that started today.
  const today = current ? dayLabel(current.startedAt) === 'Today' : false

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between pt-3.5 pr-3 pl-5">
        <div className="flex flex-col gap-0.5">
          <div className="text-[11px] font-extrabold tracking-[0.22em] text-muted">BADMINTON</div>
          <h2 id={titleId} className="text-xl font-extrabold">
            New session
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

      <div className="relative shrink-0 px-4 pt-3">
        <button
          type="button"
          onClick={openPicker}
          aria-label={`Session date and time: ${startedAt === null ? 'now' : sessionDateLabel(startedAt)}. Change`}
          className="flex h-12 w-full items-center gap-2.5 rounded-[14px] border-[1.5px] border-line-strong bg-white pr-3 pl-3.5 active:bg-soft"
        >
          <ClockIcon className="shrink-0 text-muted" />
          <span className="text-[13px] font-semibold text-muted">Starts</span>
          <span className="flex-1 truncate text-left text-[15px] font-extrabold">
            {startedAt === null ? 'Now' : sessionDateLabel(startedAt)}
          </span>
          <span className="text-[13px] font-bold text-band-ink">Change</span>
        </button>
        {/* The phone's own date-time picker, opened by the row above. */}
        <input
          ref={pickerRef}
          type="datetime-local"
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-4 h-px w-px opacity-0"
          onChange={(e) => {
            const at = new Date(e.target.value).getTime()
            if (!Number.isNaN(at)) setStartedAt(at)
          }}
        />
      </div>

      <div className="flex shrink-0 flex-col gap-1.5 px-4 pt-3">
        <div className="text-[11px] font-extrabold tracking-[0.2em] text-muted">STARTING MODE</div>
        <div role="radiogroup" aria-label="Starting mode" className="grid h-[46px] grid-cols-2 rounded-control bg-soft p-[3px]">
          {(['singles', 'doubles'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => setMode(m)}
              className={`flex items-center justify-center gap-1.5 rounded-[9px] text-sm ${
                mode === m ? 'bg-white font-extrabold text-ink shadow-[0_1px_3px_rgba(20,26,38,0.15)]' : 'font-bold text-muted'
              }`}
            >
              {m === 'singles' ? <Racket className="size-[18px]" /> : <Rackets className="h-[18px] w-5" />}
              {m === 'singles' ? 'Singles' : 'Doubles'}
            </button>
          ))}
        </div>
        <p className="text-xs text-subtle">
          {mode === 'doubles' ? 'Doubles' : 'Singles'} needs at least {min} players. You can switch modes during the session.
        </p>
      </div>

      <div className="shrink-0 px-4 pt-3 pb-1">
        <FindPlayerInput value={query} onChange={setQuery} />
      </div>

      {/* Capped height; shrinks on short screens. */}
      <div className="relative mt-1 flex min-h-[132px] flex-[0_1_318px] flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div role="group" aria-label="Players for the new session" className="grid grid-cols-3 gap-x-1.5 gap-y-1 px-3 pt-1.5 pb-6">
            <NewPlayerTile size="sm" onClick={() => setAdding(true)} />
            {shown.map((p) => (
              <SelectTile key={p.id} player={p} selected={selected.has(p.id)} onToggle={() => toggle(p.id)} />
            ))}
          </div>
          {shown.length === 0 && query.trim() && <NoMatch query={query} />}
        </div>
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-b from-white/0 to-white" />
      </div>

      <div className="shrink-0 border-t border-soft px-4 pt-3 pb-[18px]">
        <button
          type="button"
          disabled={!canStart}
          onClick={() => (current ? setConfirming(true) : start())}
          className="h-[50px] w-full rounded-[14px] bg-band text-[15px] font-extrabold text-white active:opacity-80 disabled:bg-line disabled:text-subtle"
        >
          Start session · {plural(count, 'player')}
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

      {current && (
        <ConfirmDialog
          open={confirming}
          tone="neutral"
          icon={<FlagIcon size={26} />}
          title="Start a new session?"
          description={
            <>
              This ends {today ? "tonight's" : 'the current'} session (
              <strong className="text-ink">
                {plural(current.playerIds.length, 'player')}, {plural(current.games.length, 'game')}
              </strong>
              ). The current game is reset and everyone starts at 0. {today ? "Tonight's" : 'That'} session stays in
              history.
            </>
          }
          confirmLabel="End session & start new"
          cancelLabel="Keep current session"
          onConfirm={start}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  )
}
