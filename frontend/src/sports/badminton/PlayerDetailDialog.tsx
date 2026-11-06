import { useId, useState, type FormEvent } from 'react'
import { ConfirmDialog, DialogShell } from '../../components/ui/Dialog'
import { CloseIcon, TrashIcon } from '../../components/ui/icons'
import { Avatar } from './Avatar'
import { useBadminton } from './context'
import { allPlayers, MAX_NAME_LENGTH, replay, TEAM_IDS, validateName } from './game'
import { DEFAULT_PLAYERS, TEAM_COLORS, TEAM_TINTS, type Player } from './schema'

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// Rename or delete a saved player. Opened from Manage players; `player` is null when closed.
export function PlayerDetailDialog({ player, onClose }: { player: Player | null; onClose: () => void }) {
  // Keep the last player while the card fades out (after a delete it's gone from the roster).
  const [shown, setShown] = useState(player)
  if (player && player !== shown) setShown(player)
  const titleId = useId()

  return (
    <DialogShell open={player !== null} onDismiss={onClose} labelledBy={titleId} className="gap-3.5 px-3 pt-3 pb-[18px]">
      {shown && <PlayerDetail key={shown.id} player={shown} titleId={titleId} onClose={onClose} />}
    </DialogShell>
  )
}

function PlayerDetail({ player, titleId, onClose }: { player: Player; titleId: string; onClose: () => void }) {
  const { game, court, config, dispatch } = useBadminton()
  const [name, setName] = useState(player.name)
  const [confirming, setConfirming] = useState(false)
  const inputId = useId()
  const errorId = useId()

  const trimmed = name.trim()
  // Empty or unchanged just disables Save; only a clash gets a message.
  const error = trimmed ? validateName(trimmed, allPlayers(game), player.id) : null
  const canSave = !!trimmed && !error && trimmed !== player.name

  const team = TEAM_IDS.find((t) => court.teams[t].ids.includes(player.id))
  const teamColor = team ? config.teamColors[team] : null

  function save(e: FormEvent) {
    e.preventDefault()
    if (!canSave) return
    dispatch({ type: 'renamePlayer', id: player.id, name: trimmed })
    onClose()
  }

  function remove() {
    dispatch({ type: 'deletePlayer', id: player.id })
    setConfirming(false)
    onClose()
  }

  // Who takes the slot if this on-court player is deleted (replay fills it with a free default).
  function replacementName() {
    if (!team) return null
    const slot = court.teams[team].ids.indexOf(player.id)
    const after = replay({ ...game, players: game.players.filter((p) => p.id !== player.id) }).court
    const id = after.teams[team].ids[slot]
    return DEFAULT_PLAYERS.find((p) => p.id === id)?.name ?? 'A default player'
  }

  return (
    <>
      <div className="flex justify-end">
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="flex size-11 items-center justify-center rounded-control bg-soft text-ink active:opacity-75"
        >
          <CloseIcon />
        </button>
      </div>

      <div className="-mt-[30px] flex flex-col items-center gap-2.5">
        <Avatar player={player} size={88} />
        <h2 id={titleId} className="max-w-full truncate px-12 text-[22px] font-extrabold">
          {player.name}
        </h2>
        {teamColor && (
          <div
            className="flex h-[26px] items-center gap-1.5 rounded-full px-2.5 text-xs font-bold"
            style={{ backgroundColor: TEAM_TINTS[teamColor].bg, color: TEAM_TINTS[teamColor].fg }}
          >
            <span className="size-2 rounded-full" style={{ backgroundColor: TEAM_COLORS[teamColor] }} />
            On court · Team {titleCase(teamColor)}
          </div>
        )}
      </div>

      <form onSubmit={save} className="flex flex-col gap-1.5 px-2">
        <label htmlFor={inputId} className="text-[11px] font-extrabold tracking-[0.2em] text-muted">
          NAME
        </label>
        <div className="flex gap-2">
          <input
            id={inputId}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={MAX_NAME_LENGTH}
            autoComplete="off"
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
            className={`h-12 min-w-0 flex-1 rounded-[14px] border-[1.5px] bg-white px-3.5 text-base font-semibold text-ink outline-none ${
              error
                ? 'border-danger focus:shadow-[0_0_0_3px_var(--color-danger-soft)]'
                : 'border-line-strong focus:border-band focus:shadow-[0_0_0_3px_var(--color-accent-soft)]'
            }`}
          />
          <button
            type="submit"
            disabled={!canSave}
            className="h-12 rounded-[14px] bg-band px-4 text-[15px] font-extrabold text-white active:opacity-80 disabled:bg-line disabled:text-subtle"
          >
            Save
          </button>
        </div>
        {error && (
          <p id={errorId} className="px-1 text-sm font-semibold text-danger">
            {error}
          </p>
        )}
      </form>

      <div className="mx-2 my-0.5 h-px bg-soft" />

      <div className="px-2">
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-danger-soft text-[15px] font-bold text-danger active:opacity-80"
        >
          <TrashIcon size={18} />
          Delete player
        </button>
      </div>

      {/* Stacks over this card; cancelling comes back here. */}
      <ConfirmDialog
        open={confirming}
        title={`Delete ${player.name}?`}
        description={
          team ? (
            <>
              {player.name} is on court for Team {titleCase(config.teamColors[team])}.{' '}
              <strong className="text-ink">{replacementName()}</strong> will take their place.
            </>
          ) : (
            "They'll be removed from your players. Match history keeps their name."
          )
        }
        confirmLabel="Delete player"
        cancelLabel="Keep player"
        onConfirm={remove}
        onCancel={() => setConfirming(false)}
      />
    </>
  )
}
