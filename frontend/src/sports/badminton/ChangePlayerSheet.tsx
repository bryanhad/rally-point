import { useState, type CSSProperties } from 'react'
import { BottomSheet } from '../../components/ui/BottomSheet'
import { ArrowRightIcon } from '../../components/ui/icons'
import { Avatar } from './Avatar'
import { NewPlayerDialog } from './NewPlayerDialog'
import { FindPlayerInput, NoMatch } from './PlayerGrid'
import { filterPlayers } from './playerList'
import { type CourtState } from './game'
import { TEAM_COLORS, TEAM_TINTS, type Config, type Player, type Session, type TeamId } from './schema'
import { FlameLegend, NewPlayerRow, SessionPlayerRow } from './SessionPlayerRow'
import { byName, sessionStats } from './sessionStats'

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
  // Adds a new player with this name; `replace` also puts them in the slot.
  onCreate: (name: string, replace: boolean) => void
}

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// "Change player": the current player → new swap strip, then the session players A–Z with their
// game stats.
export function ChangePlayerSheet({
  target,
  court,
  session,
  players,
  teamColors,
  onClose,
  onPick,
  onCreate,
}: ChangePlayerSheetProps) {
  // Keep showing the last target (and who stood there) while the sheet slides away, so the
  // title doesn't change or blank out mid-animation.
  const currentId = target ? court.teams[target.team].ids[target.slot] : null
  const [shown, setShown] = useState<{ team: TeamId; currentId: string } | null>(null)
  // An empty spot has currentId ''.
  if (target && currentId !== null && (shown?.team !== target.team || shown.currentId !== currentId)) {
    setShown({ team: target.team, currentId })
  }
  // The filter sits in the sheet's fixed subheader, so it lives here; it's cleared each time
  // the sheet opens.
  const [query, setQuery] = useState('')
  const [wasOpen, setWasOpen] = useState(false)
  if (!!target !== wasOpen) {
    setWasOpen(!!target)
    if (target) setQuery('')
  }

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
  // Session players only (players join a session from its Edit players), A–Z, without the one
  // being replaced. Stats count finished games only. No "won last game"
  // here (no last result passed): only who played lately matters when changing a player.
  const inProgress = { a: court.teams.a.ids, b: court.teams.b.ids }
  const rows = session
    ? byName(sessionStats(session, players, { inProgress })).filter((r) => r.player.id !== shown?.currentId)
    : []
  const [adding, setAdding] = useState(false)
  const matches = new Set(filterPlayers(rows.map((r) => r.player), query))
  const shownRows = rows.filter((r) => matches.has(r.player))

  return (
    <BottomSheet
      open={target !== null}
      onClose={onClose}
      label={`Change player for ${teamName}`}
      eyebrow={teamEyebrow}
      title="Change player"
      subheader={
        <>
          <div className="px-4 pt-3">
            <SwapStrip current={current} teamHex={teamHex} teamTint={TEAM_TINTS[teamColors[team]].bg} />
          </div>
          <div className="px-4 pt-3">
            <FindPlayerInput value={query} onChange={setQuery} />
          </div>
          <div className="flex items-baseline justify-between px-5 pt-3 pb-0">
            <div className="text-[11px] font-extrabold tracking-[0.2em] text-muted">SESSION PLAYERS</div>
            <div className="text-xs text-subtle">A–Z</div>
          </div>
        </>
      }
      fade
    >
      <ul className="flex flex-col px-3 pt-2 pb-10">
        {/* Always first, also while filtering (the filter text becomes the starting name). */}
        <li>
          <NewPlayerRow
            note={current ? `Puts them straight in for ${current.name}` : 'Puts them straight into this spot'}
            onClick={() => setAdding(true)}
          />
          <FlameLegend />
        </li>
        {shownRows.map((row) => (
          <li key={row.player.id} className="mt-0.5">
            <SessionPlayerRow
              row={row}
              teamColors={teamColors}
              onClick={() => onPick(row.player.id)}
            />
          </li>
        ))}
      </ul>
      {shownRows.length === 0 && query.trim() && <NoMatch query={query} />}

      <NewPlayerDialog
        open={adding}
        onClose={() => setAdding(false)}
        players={players}
        initialName={query.trim()}
        eyebrow={teamEyebrow}
        primaryLabel={current ? `Add & replace ${current.name}` : 'Add & put on court'}
        onPrimary={(name) => {
          setAdding(false)
          onCreate(name, true)
        }}
        secondaryLabel="Just add to players"
        onSecondary={(name) => {
          setAdding(false)
          onCreate(name, false)
        }}
      />
    </BottomSheet>
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
