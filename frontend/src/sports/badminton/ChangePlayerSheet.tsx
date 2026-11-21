import { useId, useState, type CSSProperties } from 'react'
import { BottomSheet } from '../../components/ui/BottomSheet'
import { DialogShell } from '../../components/ui/Dialog'
import { ArrowRightIcon, CloseIcon } from '../../components/ui/icons'
import { TABLET, useMediaQuery } from '../../components/ui/overlay'
import { Avatar } from './Avatar'
import { NewPlayerDialog } from './NewPlayerDialog'
import { AddToSessionDialog } from './AddToSessionDialog'
import { type CourtState } from './game'
import { sessionOrder } from './queue'
import { TEAM_COLORS, TEAM_TINTS, type Config, type Player, type Session, type TeamId } from './schema'
import { PlayerSearch, SessionPlayersList } from './SessionPlayersList'

export type PickerTarget = { team: TeamId; slot: number }

type ChangePlayerSheetProps = {
  // The court slot being changed; null when closed.
  target: PickerTarget | null
  court: CourtState
  // The running session; without one there's nobody to list (games are played in a session).
  session: Session | null
  // All saved players (current names and colours; new names must differ from all of them).
  players: Player[]
  teamColors: Config['teamColors']
  onClose: () => void
  onPick: (playerId: string) => void
  // Registers a new player with this name (joining the session, arrived after that many games);
  // `replace` also puts them in the slot.
  onCreate: (name: string, replace: boolean, joinedAfterGame: number) => void
  // A registered player outside the session (found by searching) joins it.
  onAddToSession: (playerId: string, joinedAfterGame: number) => void
}

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// "Change player": the current player → new swap strip, a search, then the session players in
// the fairness order (WAITING, JUST PLAYED, ON COURT). A centred modal on phones; on tablets
// the usual sheet (side panel in landscape, bottom sheet in portrait).
export function ChangePlayerSheet({
  target,
  court,
  session,
  players,
  teamColors,
  onClose,
  onPick,
  onCreate,
  onAddToSession,
}: ChangePlayerSheetProps) {
  const tablet = useMediaQuery(TABLET)
  // Keep showing the last target (and who stood there) while it closes, so the title doesn't
  // change or blank out mid-animation.
  const currentId = target ? court.teams[target.team].ids[target.slot] : null
  const [shown, setShown] = useState<{ team: TeamId; currentId: string } | null>(null)
  // An empty spot has currentId ''.
  if (target && currentId !== null && (shown?.team !== target.team || shown.currentId !== currentId)) {
    setShown({ team: target.team, currentId })
  }
  // The search is cleared each time it opens.
  const [query, setQuery] = useState('')
  const [wasOpen, setWasOpen] = useState(false)
  if (!!target !== wasOpen) {
    setWasOpen(!!target)
    if (target) setQuery('')
  }
  // Register: the name New player starts with (null: closed).
  const [registering, setRegistering] = useState<string | null>(null)
  // Add to this session: the NOT IN SESSION player tapped (null: closed).
  const [adding, setAdding] = useState<Player | null>(null)
  const titleId = useId()

  const team = shown?.team ?? 'a'
  const current = players.find((p) => p.id === shown?.currentId)
  const teamName = `Team ${titleCase(teamColors[team])}`
  const teamHex = TEAM_COLORS[teamColors[team]]
  const teamEyebrow = (
    <span className="flex items-center gap-1.5" style={{ color: TEAM_TINTS[teamColors[team]].fg }}>
      <span className="size-2 rounded-full" style={{ backgroundColor: teamHex }} />
      {teamName}
    </span>
  )
  // The session players without the one being replaced (they're in the CURRENT spot). No
  // winners band or markers here: only who played lately matters when changing a player.
  const onCourt = { a: court.teams.a.ids, b: court.teams.b.ids }
  const rows = session
    ? sessionOrder(session, players, 'change', { onCourt }).filter((r) => r.player.id !== shown?.currentId)
    : []
  const hidden = new Set(shown?.currentId ? [shown.currentId] : [])
  const forWhom = current ? `in for ${current.name}` : 'into this spot'

  const strip = <SwapStrip current={current} teamHex={teamHex} teamTint={TEAM_TINTS[teamColors[team]].bg} />
  const search = <PlayerSearch value={query} onChange={setQuery} />
  const list = (
    <SessionPlayersList
      entries={rows}
      players={players}
      hidden={hidden}
      query={query}
      teamColors={teamColors}
      // On court: tapping swaps places (a teammate swaps partners).
      onSelect={(row) => onPick(row.player.id)}
      // Asks when they arrived first (Add to this session).
      onAddOutsider={setAdding}
      onRegister={setRegistering}
      emptyNote={`They're not registered yet. Register them and they go straight ${forWhom}.`}
      registerLabel={(name) => `Register & put in ${name}`}
    />
  )
  const games = session?.games.length ?? 0
  const register = (
    <>
      <NewPlayerDialog
        open={registering !== null}
        onClose={() => setRegistering(null)}
        players={players}
        initialName={registering ?? ''}
        eyebrow={teamEyebrow}
        arrival={session ? { games } : undefined}
        primaryLabel={current ? `Register & put in for ${current.name}` : 'Register & put on court'}
        onPrimary={(name, arrived) => {
          setRegistering(null)
          onCreate(name, true, arrived)
        }}
        secondaryLabel="Just add to players"
        onSecondary={(name, arrived) => {
          setRegistering(null)
          setQuery('')
          onCreate(name, false, arrived)
        }}
      />
      <AddToSessionDialog
        player={adding}
        onClose={() => setAdding(null)}
        games={games}
        eyebrow={teamEyebrow}
        primaryLabel={current ? `Add & put in for ${current.name}` : 'Add & put on court'}
        onAdd={(player, arrived) => {
          setAdding(null)
          onAddToSession(player.id, arrived)
          onPick(player.id)
        }}
      />
    </>
  )

  if (tablet) {
    return (
      <BottomSheet
        open={target !== null}
        onClose={onClose}
        label={`Change player for ${teamName}`}
        eyebrow={teamEyebrow}
        title="Change player"
        subheader={
          <>
            <div className="px-4 pt-3">{strip}</div>
            <div className="px-4 pt-3 pb-1.5">{search}</div>
          </>
        }
        fade
      >
        {list}
        {register}
      </BottomSheet>
    )
  }

  return (
    <DialogShell
      open={target !== null}
      onDismiss={onClose}
      labelledBy={titleId}
      width="max-w-[480px]"
      // The list gets most of the screen: 16px from the sides, 24px top and bottom.
      className="h-full max-h-[calc(100dvh-48px)] overflow-hidden rounded-[24px]!"
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex shrink-0 items-start justify-between pt-3.5 pr-3 pl-5">
          <div className="flex flex-col gap-1">
            <div className="text-[11px] font-extrabold tracking-[0.2em] uppercase">{teamEyebrow}</div>
            <h2 id={titleId} className="text-[22px] font-extrabold">
              Change player
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex size-11 shrink-0 items-center justify-center rounded-control bg-soft text-ink active:opacity-75"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="shrink-0 px-4 pt-3">{strip}</div>
        <div className="shrink-0 px-4 pt-3 pb-1.5">{search}</div>
        <div className="relative min-h-0 flex-1">
          <div className="h-full overflow-y-auto overscroll-contain">{list}</div>
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-b from-white/0 to-white" />
        </div>
      </div>
      {register}
    </DialogShell>
  )
}

// CURRENT player → NEW (still to pick).
function SwapStrip({ current, teamHex, teamTint }: { current: Player | undefined; teamHex: string; teamTint: string }) {
  return (
    <div className="flex items-center justify-center gap-[22px] rounded-2xl bg-page px-3 pt-3.5 pb-3">
      <div className="flex w-24 flex-col items-center gap-1.5">
        {current ? (
          <Avatar player={current} size={48} style={{ boxShadow: `0 0 0 2px var(--color-page), 0 0 0 4px ${teamHex}` }} />
        ) : (
          <span className="size-12 rounded-full border-2 border-dashed border-line-dashed bg-white" />
        )}
        <span className="max-w-full truncate text-[13px] font-bold">{current ? current.name : 'Empty spot'}</span>
        <Pill style={{ backgroundColor: 'var(--color-line)', color: 'var(--color-ink-2)' }}>CURRENT</Pill>
      </div>
      <ArrowRightIcon className="mb-[26px] shrink-0 text-subtle" />
      <div className="flex w-24 flex-col items-center gap-1.5">
        <span
          aria-hidden
          className="flex size-12 items-center justify-center rounded-full border-2 border-dashed bg-white text-[22px] font-extrabold"
          style={{ borderColor: teamHex, color: teamHex, boxShadow: `0 0 0 4px ${teamTint}` }}
        >
          ?
        </span>
        <span className="text-[13px] font-semibold text-subtle">Pick below</span>
        <Pill style={{ backgroundColor: teamHex, color: '#FFFFFF' }}>NEW</Pill>
      </div>
    </div>
  )
}

function Pill({ style, children }: { style?: CSSProperties; children: string }) {
  return (
    <span className="flex h-[18px] items-center rounded-full px-2 text-[10px] font-extrabold tracking-[0.1em]" style={style}>
      {children}
    </span>
  )
}
