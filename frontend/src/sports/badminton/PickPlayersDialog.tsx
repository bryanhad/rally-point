import { useId, useReducer, useState } from 'react'
import { DialogShell } from '../../components/ui/Dialog'
import { CheckIcon, CloseIcon } from '../../components/ui/icons'
import { Court, ViewChip } from './Court'
import { EMPTY_SLOT, teamOn, type CourtState } from './game'
import { MOTION, useCrossSlide, useViewFlip } from './motion'
import { findPlayer, initialPick, isFull, pickedCount, pickReducer, screenOrder, type PickAction, type PickState } from './pick'
import { NewPlayerDialog } from './NewPlayerDialog'
import { AddToSessionDialog } from './AddToSessionDialog'
import { TEAM_COLORS, type Config, type CourtView, type HistoryEntry, type Player, type Session, type TeamId } from './schema'
import { viewSide } from './view'
import { nextGameNumber } from './session'
import { sessionOrder } from './queue'
import { PlayerSearch, SessionPlayersList } from './SessionPlayersList'

type PickPlayersDialogProps = {
  open: boolean
  onClose: () => void
  session: Session | null
  // Saved players (current names and colours).
  players: readonly Player[]
  // The session's last finished game, for "won last game".
  lastResult: HistoryEntry | null
  // Register: saves them, adds them to the session (arrived after that many games) and returns
  // their id.
  // `intoSlot`: false for "Just add to players" (the scoreboard then confirms they joined).
  onCreatePlayer: (name: string, joinedAfterGame: number, intoSlot: boolean) => string
  // A registered player outside the session (found by searching) joins it.
  onAddToSession: (playerId: string, joinedAfterGame: number) => void
  mode: Config['mode']
  teamColors: Config['teamColors']
  // The scoreboard's court (its ends and serve): the mini court puts the picks where they will
  // stand. The team on the left (Referee view) gets its slots first.
  court: CourtState
  // The scoreboard's view setting, shared: flipping it here flips the scoreboard too.
  view: CourtView
  onFlipView: () => void
  // "Start game": the picked lineup.
  onStart: (lineup: Record<TeamId, string[]>) => void
}

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// Pick this game's players: a mini court with the slots where they will stand, over the session
// players (last game's winners, then fewest games). Always opens empty; "Same players" on the
// court is the rematch shortcut.
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
  onAddToSession,
  mode,
  teamColors,
  court,
  view,
  onFlipView,
  onStart,
}: Omit<PickPlayersDialogProps, 'open' | 'session'> & { session: Session; titleId: string }) {
  const size = mode === 'singles' ? 1 : 2
  // The same flip as the scoreboard: the card turns over and switches view when edge-on.
  const { shown, phase } = useViewFlip(view)
  // Fill order as the slots are drawn (the view the card shows): top-left, bottom-left,
  // top-right, bottom-right.
  const order = screenOrder(court, size, shown)
  const [pick, dispatch] = useReducer(
    (s: PickState, a: PickAction) => pickReducer(s, a, order),
    undefined,
    () => initialPick(size, order),
  )
  // A flip changes which slot is top-left: the next pick goes there again (the first empty slot
  // in the new order). Done when the card switches faces (edge-on), not at the tap, so the halo
  // never jumps on the face that is still turning; adjusted during render so the new face
  // already shows it in place.
  const [orderView, setOrderView] = useState(shown)
  if (orderView !== shown) {
    setOrderView(shown)
    dispatch({ type: 'reorder' })
  }
  // Session players still here, in the fairness order: JUST WON, WAITING, JUST PLAYED.
  const rows = sessionOrder(session, players, 'pick', { lastResult })
  const [query, setQuery] = useState('')
  // Register: the name to start New player with (null: closed).
  const [registering, setRegistering] = useState<string | null>(null)
  // Add to this session: the NOT IN SESSION player tapped (null: closed).
  const [adding, setAdding] = useState<Player | null>(null)
  const byId = new Map(players.map((p) => [p.id, p]))
  const full = isFull(pick)
  const teamName = (team: TeamId) => `Team ${titleCase(teamColors[team])}`
  // "● TEAM BLUE · SLOT 2": the slot a new or added player goes into.
  const activeColor = teamColors[pick.active.team]
  const slotEyebrow = (
    <span className="flex items-center gap-1.5" style={{ color: TEAM_COLORS[activeColor] }}>
      <span className="size-2 rounded-full" style={{ backgroundColor: TEAM_COLORS[activeColor] }} />
      {teamName(pick.active.team)} · Slot {pick.active.slot + 1}
    </span>
  )
  // The picks on the scoreboard's court, at 0–0 (where the game will start).
  const mini: CourtState = {
    ...court,
    teams: { a: { score: 0, ids: pick.slots.a }, b: { score: 0, ids: pick.slots.b } },
  }
  const slotLabel = (team: TeamId, slot: number) => {
    const id = pick.slots[team][slot]
    const active = pick.active.team === team && pick.active.slot === slot
    const name = id === EMPTY_SLOT ? null : (byId.get(id)?.name ?? '?')
    const where = `${teamName(team)} slot ${slot + 1}`
    if (!name) return `${where}, empty${active ? ', picking now' : ''}`
    return `${where}, ${name}${active ? ', selected: next pick replaces them' : ''}`
  }
  // The team pills follow the view at once and cross-slide like the scoreboard's score buttons
  // (same timing, Team A passing on top), while the card flips under them.
  const screenTeams = [teamOn(court, viewSide('left', view)), teamOn(court, viewSide('right', view))]
  const pillRef = useCrossSlide(screenTeams, { duration: MOTION.slide, onTop: 'a' })

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

      {/* The mini court: the scoreboard's court at 86% (chips too), 23px in from each side on a
          phone, with the team pills over its halves. Tablets cap it so the list keeps its room. */}
      <div className="shrink-0 px-3.5 pt-3">
        <div className="mx-auto max-w-[440px] px-[23px]">
          <div className="flex justify-between pb-2">
            {screenTeams.map((team, i) => (
              <span
                key={team}
                ref={pillRef(team)}
                className="inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[10px] font-extrabold tracking-[0.14em] text-white"
                style={{ backgroundColor: TEAM_COLORS[teamColors[team]] }}
              >
                {i === 0 && <span className="size-[7px] rounded-full bg-white" />}
                {teamName(team).toUpperCase()}
                {i === 1 && <span className="size-[7px] rounded-full bg-white" />}
              </span>
            ))}
          </div>
          <div style={{ zoom: 0.86 }}>
            <Court
              court={mini}
              byId={byId}
              colors={teamColors}
              view={shown}
              flip={phase}
              viewChip={false}
              onPick={(team, slot) => dispatch({ type: 'tapSlot', at: { team, slot } })}
              picking={{ active: pick.active, label: slotLabel }}
            />
          </div>
        </div>
      </div>

      {/* Search, and the view chip beside it (only here). */}
      <div className="flex shrink-0 items-center gap-2 px-3.5 pt-3 pb-1.5">
        <div className="min-w-0 flex-1">
          <PlayerSearch value={query} onChange={setQuery} />
        </div>
        <ViewChip view={view} size="search" onFlip={onFlipView} />
      </div>

      <div className="relative min-h-0 flex-1">
        <div className="h-full overflow-y-auto overscroll-contain">
          <SessionPlayersList
            entries={rows}
            players={players}
            query={query}
            teamColors={teamColors}
            winners
            // Picked players are changed from the slots above, not from here.
            isDisabled={(row) => !!findPlayer(pick, row.player.id)}
            onSelect={(row) => dispatch({ type: 'tapPlayer', id: row.player.id })}
            labelSuffix={(row) => {
              const at = findPlayer(pick, row.player.id)
              return at ? `, on ${teamName(at.team)}` : ''
            }}
            trailing={(row) => {
              const at = findPlayer(pick, row.player.id)
              const color = at ? teamColors[at.team] : null
              // The team-coloured check is the only "picked" signal.
              return color ? (
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full text-white" style={{ backgroundColor: TEAM_COLORS[color] }}>
                  <CheckIcon size={12} strokeWidth={3.4} />
                </span>
              ) : (
                <span className="size-6 shrink-0 rounded-full border-[1.5px] border-line-dashed" />
              )
            }}
            // Asks when they arrived first (Add to this session).
            onAddOutsider={setAdding}
            onRegister={setRegistering}
            emptyNote="They're not registered yet. Register them and they go straight into the slot you're picking."
            registerLabel={(name) => `Register & add ${name}`}
          />
        </div>
        <NewPlayerDialog
          open={registering !== null}
          onClose={() => setRegistering(null)}
          players={[...players]}
          initialName={registering ?? ''}
          eyebrow={slotEyebrow}
          arrival={{ games: session.games.length }}
          primaryLabel="Register & add to slot"
          onPrimary={(name, arrived) => {
            setRegistering(null)
            setQuery('')
            dispatch({ type: 'tapPlayer', id: onCreatePlayer(name, arrived, true) })
          }}
          secondaryLabel="Just add to players"
          onSecondary={(name, arrived) => {
            setRegistering(null)
            setQuery('')
            onCreatePlayer(name, arrived, false)
          }}
        />
        <AddToSessionDialog
          player={adding}
          onClose={() => setAdding(null)}
          games={session.games.length}
          eyebrow={slotEyebrow}
          primaryLabel="Add & put in slot"
          onAdd={(player, arrived) => {
            setAdding(null)
            setQuery('')
            onAddToSession(player.id, arrived)
            dispatch({ type: 'tapPlayer', id: player.id })
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
