import { useEffect, useRef, useState, type FormEvent } from 'react'
import { BottomSheet } from '../../components/ui/BottomSheet'
import { EditIcon, PlusIcon, TrashIcon } from '../../components/ui/icons'
import { newId } from '../../lib/id'
import { Avatar } from './Avatar'
import { useBadminton } from './context'
import { MAX_NAME_LENGTH, allPlayers, validateName } from './game'
import { DEFAULT_PLAYERS, type Player } from './schema'

const LABEL = 'px-1 text-[11px] font-extrabold tracking-[0.2em] text-muted uppercase'
const ROW_BUTTON =
  'flex size-11 shrink-0 items-center justify-center rounded-control active:bg-soft disabled:text-disabled'

export function PlayersSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { game, dispatch } = useBadminton()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  function add(e: FormEvent) {
    e.preventDefault()
    const problem = validateName(name, allPlayers(game))
    if (problem) return setError(problem)
    dispatch({ type: 'addPlayer', id: newId(), name })
    setName('')
    setError(null)
  }

  return (
    <BottomSheet open={open} onClose={onClose} eyebrow="Badminton" title="Players">
      <form onSubmit={add} className="px-4 pt-4 pb-2">
        <div className="flex gap-2">
          <label htmlFor="new-player" className="sr-only">
            Player name
          </label>
          <input
            id="new-player"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setError(null)
            }}
            maxLength={MAX_NAME_LENGTH}
            placeholder="Add a player name"
            aria-invalid={!!error}
            aria-describedby={error ? 'new-player-error' : undefined}
            className="h-[50px] min-w-0 flex-1 rounded-[14px] border-[1.5px] border-line-strong bg-white px-3.5 text-base text-ink placeholder:text-faint"
          />
          <button
            type="submit"
            className="flex h-[50px] items-center gap-1.5 rounded-[14px] bg-band px-[18px] text-[15px] font-extrabold text-white active:opacity-80"
          >
            <PlusIcon size={16} />
            Add
          </button>
        </div>
        {error && (
          <p id="new-player-error" className="mt-1.5 px-1 text-sm font-semibold text-danger">
            {error}
          </p>
        )}
      </form>

      <div className="flex flex-col gap-4 px-4 pt-2 pb-[max(16px,env(safe-area-inset-bottom))]">
        <section className="flex flex-col gap-2">
          <h3 className={LABEL}>Default players</h3>
          <ul className="grid grid-cols-2 gap-2">
            {DEFAULT_PLAYERS.map((p) => (
              <li
                key={p.id}
                className="flex h-10 items-center gap-2 rounded-full bg-page pr-3.5 pl-1 text-sm font-semibold text-muted"
              >
                <Avatar name={p.name} size={32} tone="plain" />
                {p.name}
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <h3 className={LABEL.replace('px-1 ', '')}>Your players</h3>
            <span className="text-xs font-bold text-muted">{game.players.length}</span>
          </div>
          {game.players.length === 0 ? (
            <p className="rounded-card border-[1.5px] border-dashed border-line-dashed px-4 py-5 text-center text-sm text-muted">
              No saved players yet
            </p>
          ) : (
            <ul className="overflow-hidden rounded-card border-[1.5px] border-line">
              {game.players.map((p) => (
                <PlayerRow key={p.id} player={p} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </BottomSheet>
  )
}

function PlayerRow({ player }: { player: Player }) {
  const { game, dispatch } = useBadminton()
  const [mode, setMode] = useState<'view' | 'edit' | 'delete'>('view')
  const [draft, setDraft] = useState(player.name)
  const [error, setError] = useState<string | null>(null)
  const cancelDeleteRef = useRef<HTMLButtonElement>(null)

  // Entering the delete confirmation starts on the safe choice.
  useEffect(() => {
    if (mode === 'delete') cancelDeleteRef.current?.focus()
  }, [mode])

  function save(e: FormEvent) {
    e.preventDefault()
    const problem = validateName(draft, allPlayers(game), player.id)
    if (problem) return setError(problem)
    dispatch({ type: 'renamePlayer', id: player.id, name: draft })
    setMode('view')
  }

  function cancelEdit() {
    setDraft(player.name)
    setError(null)
    setMode('view')
  }

  const row = 'flex items-center gap-3 border-b border-soft py-1.5 pr-1.5 pl-3 last:border-b-0'

  if (mode === 'delete') {
    // Inline confirmation instead of deleting straight away.
    return (
      <li className={`${row} gap-2 bg-danger-soft`}>
        <Avatar name={player.name} tone="danger" />
        <div className="min-w-0 flex-1 truncate text-sm font-semibold text-danger-ink">Delete {player.name}?</div>
        <button
          ref={cancelDeleteRef}
          type="button"
          onClick={() => setMode('view')}
          className="h-10 rounded-[10px] px-3 text-sm font-bold text-ink-2 active:bg-white/60"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => dispatch({ type: 'deletePlayer', id: player.id })}
          className="h-10 rounded-[10px] bg-ink px-3 text-sm font-bold text-white active:opacity-80"
        >
          Delete
        </button>
      </li>
    )
  }

  if (mode === 'edit') {
    return (
      <li className={`${row} flex-col items-stretch gap-1`}>
        <form onSubmit={save} className="flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
              setError(null)
            }}
            maxLength={MAX_NAME_LENGTH}
            aria-label={`Rename ${player.name}`}
            aria-invalid={!!error}
            autoFocus
            className="h-11 min-w-0 flex-1 rounded-control border-[1.5px] border-line-strong px-3 text-base"
          />
          <button type="submit" className="h-11 rounded-control bg-band px-3.5 text-sm font-bold text-white">
            Save
          </button>
          <button type="button" onClick={cancelEdit} className="h-11 px-2 text-sm font-bold text-ink-2">
            Cancel
          </button>
        </form>
        {error && <p className="px-1 text-sm font-semibold text-danger">{error}</p>}
      </li>
    )
  }

  return (
    <li className={row}>
      <Avatar name={player.name} />
      <div className="min-w-0 flex-1 truncate text-base font-semibold">{player.name}</div>
      <button
        type="button"
        aria-label={`Edit ${player.name}`}
        onClick={() => setMode('edit')}
        className={`${ROW_BUTTON} text-ink-2`}
      >
        <EditIcon />
      </button>
      <button
        type="button"
        aria-label={`Delete ${player.name}`}
        onClick={() => setMode('delete')}
        className={`${ROW_BUTTON} text-danger`}
      >
        <TrashIcon size={18} />
      </button>
    </li>
  )
}
