import { useId, useReducer, useState } from 'react'
import { DialogShell } from '../../components/ui/Dialog'
import { CheckIcon, CloseIcon, PlusIcon } from '../../components/ui/icons'
import { Avatar } from './Avatar'
import { EMPTY_SLOT, otherTeam } from './game'
import { findPlayer, initialPick, isFull, pickedCount, pickReducer, slotOrder, type PickAction, type PickState, type SlotRef } from './pick'
import { NewPlayerDialog } from './NewPlayerDialog'
import { TEAM_COLORS, TEAM_TINTS, type Config, type HistoryEntry, type Player, type Session, type TeamColor, type TeamId } from './schema'
import { nextGameNumber } from './session'
import { FlameLegend, NewPlayerRow, SessionPlayerRow } from './SessionPlayerRow'
import { pickOrder, sessionStats } from './sessionStats'

type PickPlayersDialogProps = {
  open: boolean
  onClose: () => void
  session: Session | null
  // Saved players (current names and colours).
  players: readonly Player[]
  // The session's last finished game, for "won last game".
  lastResult: HistoryEntry | null
  // New player row: saves them, adds them to the session and returns their id.
  onCreatePlayer: (name: string) => string
  mode: Config['mode']
  teamColors: Config['teamColors']
  // The team on the left of the court: its slots come first.
  leftTeam: TeamId
  // "Start game": the picked lineup.
  onStart: (lineup: Record<TeamId, string[]>) => void
}

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// Pick this game's players: a slot strip per team over the session players (last game's
// winners, then fewest games). Always opens empty; "Same players" on the court is the rematch shortcut.
export function PickPlayersDialog({ open, onClose, session, ...rest }: PickPlayersDialogProps) {
  const titleId = useId()
  // Keep the last session while the card fades out.
  const [shown, setShown] = useState(session)
  if (session && session !== shown) setShown(session)
  return (
    <DialogShell
      open={open}
      onDismiss={onClose}
      labelledBy={titleId}
      width="max-w-sm tablet-portrait:max-w-[600px] tablet-landscape:max-w-[560px]"
      // Fills the height and the list scrolls inside; capped on phones, uncapped on tablets
      // (24px margins).
      className="h-full max-h-[880px] overflow-hidden tablet:max-h-none"
    >
      {/* Remounted on every opening (the shell unmounts when closed), so the slots start empty. */}
      {shown && <PickForm {...rest} session={shown} titleId={titleId} onClose={onClose} />}
    </DialogShell>
  )
}

function PickForm({
  titleId,
  onClose,
  session,
  players,
  lastResult,
  onCreatePlayer,
  mode,
  teamColors,
  leftTeam,
  onStart,
}: Omit<PickPlayersDialogProps, 'open' | 'session'> & { session: Session; titleId: string }) {
  const size = mode === 'singles' ? 1 : 2
  const order = slotOrder(size, leftTeam)
  const [pick, dispatch] = useReducer(
    (s: PickState, a: PickAction) => pickReducer(s, a, order),
    undefined,
    () => initialPick(size, leftTeam),
  )
  // Session players still here: last game's winners, then fewest games, ties A–Z.
  const rows = pickOrder(sessionStats(session, players, { lastResult }))
  const [adding, setAdding] = useState(false)
  const byId = new Map(rows.map((r) => [r.player.id, r.player]))
  const full = isFull(pick)
  const teamName = (team: TeamId) => `Team ${titleCase(teamColors[team])}`

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between pt-3.5 pr-3 pl-5">
        <div className="flex flex-col gap-0.5">
          <div className="text-[11px] font-extrabold tracking-[0.22em] text-muted">
            GAME {nextGameNumber(session)} · {mode.toUpperCase()}
          </div>
          <h2 id={titleId} className="text-xl font-extrabold">
            Pick players
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

      <div className="shrink-0 px-3.5 pt-3">
        <div className="flex flex-col gap-2 rounded-2xl bg-page px-3 py-2.5">
          <div className="flex items-start justify-between">
            {[leftTeam, otherTeam(leftTeam)].map((team, i) => (
              <TeamSlots
                key={team}
                team={team}
                color={teamColors[team]}
                align={i === 0 ? 'start' : 'end'}
                ids={pick.slots[team]}
                active={pick.active}
                byId={byId}
                name={teamName(team)}
                onTap={(slot) => dispatch({ type: 'tapSlot', at: { team, slot } })}
                onClear={(slot) => dispatch({ type: 'clear', at: { team, slot } })}
              />
            )).flatMap((el, i) =>
              i === 0
                ? [
                    el,
                    <span key="vs" aria-hidden className="mt-2 self-center text-[13px] font-extrabold tracking-[0.06em] text-subtle">
                      vs
                    </span>,
                  ]
                : [el],
            )}
          </div>
          <p className="text-center text-xs text-muted">Tap a slot, then a player to put them there</p>
        </div>
      </div>

      <div className="flex shrink-0 items-baseline justify-between px-5 pt-3.5 pb-1">
        <div className="text-[11px] font-extrabold tracking-[0.2em] text-muted">SESSION PLAYERS</div>
        <div className="text-xs text-subtle">Winners, then fewest games</div>
      </div>

      <div className="relative min-h-0 flex-1">
        <ul className="h-full overflow-y-auto overscroll-contain px-3 pb-6">
          <li>
            <NewPlayerRow note="Adds them to this session and slot" onClick={() => setAdding(true)} />
            <FlameLegend />
          </li>
          {rows.map((row) => {
            const at = findPlayer(pick, row.player.id)
            const color = at ? teamColors[at.team] : null
            return (
              <li key={row.player.id} className="mt-0.5">
                <SessionPlayerRow
                  row={row}
                  teamColors={teamColors}
                  // Picked players are changed from the slots above, not from here.
                  disabled={!!at}
                  onClick={() => dispatch({ type: 'tapPlayer', id: row.player.id })}
                  labelSuffix={at ? `, on ${teamName(at.team)}` : ''}
                  style={{ backgroundColor: color ? `color-mix(in srgb, ${TEAM_TINTS[color].bg} 65%, white)` : undefined }}
                  trailing={
                    color ? (
                      <span
                        className="flex size-6 shrink-0 items-center justify-center rounded-full text-white"
                        style={{ backgroundColor: TEAM_COLORS[color] }}
                      >
                        <CheckIcon size={12} strokeWidth={3.4} />
                      </span>
                    ) : (
                      <span className="size-6 shrink-0 rounded-full border-[1.5px] border-line-dashed" />
                    )
                  }
                />
              </li>
            )
          })}
        </ul>
        <NewPlayerDialog
          open={adding}
          onClose={() => setAdding(false)}
          players={[...players]}
          primaryLabel="Add & pick"
          onPrimary={(name) => {
            setAdding(false)
            dispatch({ type: 'tapPlayer', id: onCreatePlayer(name) })
          }}
        />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-b from-white/0 to-white" />
      </div>

      <div className="shrink-0 border-t border-soft px-4 pt-3 pb-4">
        <button
          type="button"
          disabled={!full}
          onClick={() => onStart(pick.slots)}
          className="h-[50px] w-full rounded-[14px] bg-band text-[15px] font-extrabold text-white active:opacity-80 disabled:bg-line disabled:text-subtle"
        >
          {full ? 'Start game' : `Start game · ${pickedCount(pick)} of ${size * 2} picked`}
        </button>
      </div>
    </div>
  )
}

type TeamSlotsProps = {
  team: TeamId
  color: TeamColor
  name: string
  align: 'start' | 'end'
  ids: string[]
  active: SlotRef
  byId: Map<string, Player>
  onTap: (slot: number) => void
  onClear: (slot: number) => void
}

function TeamSlots({ team, color, name, align, ids, active, byId, onTap, onClear }: TeamSlotsProps) {
  const hex = TEAM_COLORS[color]
  const tint = TEAM_TINTS[color]
  const dot = <span className="size-2 rounded-full" style={{ backgroundColor: hex }} />
  return (
    <div className={`flex flex-col gap-2.5 ${align === 'start' ? 'items-start' : 'items-end'}`}>
      <div className="flex items-center gap-1.5 text-[11px] font-extrabold tracking-[0.18em]" style={{ color: tint.fg }}>
        {align === 'start' && dot}
        {name.toUpperCase()}
        {align === 'end' && dot}
      </div>
      <div className="flex gap-1">
        {ids.map((id, slot) => {
          const player = id === EMPTY_SLOT ? undefined : byId.get(id)
          const isActive = active.team === team && active.slot === slot
          const label = `${name} slot ${slot + 1}: ${
            player
              ? `${player.name}, ${isActive ? 'active, tap a player to replace' : 'tap to pick for this slot'}`
              : isActive
                ? 'active, tap a player to fill'
                : 'empty, tap to pick for this slot'
          }`
          const tag = (
            <span
              className="flex h-4 items-center rounded-full px-1.5 text-[9px] font-extrabold tracking-[0.08em] text-white"
              style={{ backgroundColor: hex }}
            >
              PICKING
            </span>
          )
          return (
            <div key={slot} className="relative w-16">
              <button
                type="button"
                aria-label={label}
                aria-pressed={isActive}
                onClick={() => onTap(slot)}
                className="flex w-full flex-col items-center gap-[5px]"
              >
                {player ? (
                  <Avatar
                    player={player}
                    size={44}
                    style={{
                      boxShadow: isActive
                        ? `0 0 0 2px var(--color-page), 0 0 0 5.5px ${hex}, 0 0 0 9px ${tint.bg}`
                        : `0 0 0 2px var(--color-page), 0 0 0 4px ${hex}`,
                    }}
                  />
                ) : isActive ? (
                  <span
                    className="flex size-11 items-center justify-center rounded-full border-[2.5px] border-dashed bg-white"
                    style={{ borderColor: hex, color: hex, boxShadow: `0 0 0 4px ${tint.bg}` }}
                  >
                    <PlusIcon size={18} />
                  </span>
                ) : (
                  <span className="size-11 rounded-full border-2 border-dashed border-line-dashed bg-white" />
                )}
                {player && <span className="max-w-16 truncate text-[11px] font-bold text-ink">{player.name}</span>}
                {!player && !isActive && <span className="text-[11px] font-semibold text-subtle">Empty</span>}
                {isActive && tag}
              </button>
              {/* × to empty the slot: its own 28px target over the avatar's top-right. */}
              {player && (
                <button
                  type="button"
                  aria-label={`Remove ${player.name} from ${name}`}
                  onClick={() => onClear(slot)}
                  className="absolute -top-[11px] left-[37px] flex size-7 items-center justify-center"
                >
                  <span className="flex size-[18px] items-center justify-center rounded-full border-2 border-page bg-soft text-muted">
                    <CloseIcon size={8} />
                  </span>
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
