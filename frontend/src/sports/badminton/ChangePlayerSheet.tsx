import { useState, type CSSProperties, type ReactNode } from 'react'
import { BottomSheet } from '../../components/ui/BottomSheet'
import { Avatar } from './Avatar'
import { NewPlayerDialog } from './NewPlayerDialog'
import { FindPlayerInput, NewPlayerTile, NoMatch } from './PlayerGrid'
import { filterPlayers, TILE_LG } from './playerList'
import { sortByName, TEAM_IDS, type CourtState } from './game'
import { TEAM_COLORS, TEAM_TINTS, type Config, type Player, type TeamId } from './schema'

export type PickerTarget = { team: TeamId; slot: number }

type ChangePlayerSheetProps = {
  // The court slot being changed; null when closed.
  target: PickerTarget | null
  court: CourtState
  // Saved players only; the defaults are added here.
  saved: Player[]
  teamColors: Config['teamColors']
  onClose: () => void
  onPick: (playerId: string) => void
  // Adds a new player with this name; `replace` also puts them in the slot.
  onCreate: (name: string, replace: boolean) => void
}

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// "Change player": the player being replaced in the header, then everyone else in a fixed
// order (A–Z), with the other on-court players tagged.
export function ChangePlayerSheet({ target, court, saved, teamColors, onClose, onPick, onCreate }: ChangePlayerSheetProps) {
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

  const players = sortByName(saved)
  const current = players.find((p) => p.id === shown?.currentId)
  const team = shown?.team ?? 'a'
  const teamName = `Team ${titleCase(teamColors[team])}`
  const teamHex = TEAM_COLORS[teamColors[team]]
  const teamEyebrow = (
    <span className="flex items-center gap-1.5" style={{ color: TEAM_COLORS[teamColors[team]] }}>
      <span className="size-2 rounded-full" style={{ backgroundColor: TEAM_COLORS[teamColors[team]] }} />
      {teamName}
    </span>
  )

  return (
    <BottomSheet
      open={target !== null}
      onClose={onClose}
      label={`Change player for ${teamName}`}
      eyebrow={teamEyebrow}
      title="Change player"
      subtitle={
        current ? (
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-[13px] font-semibold text-muted">Replacing</span>
            <span className="flex h-[34px] min-w-0 items-center gap-2 rounded-full bg-soft pr-3 pl-[3px]">
              <span
                className="flex shrink-0 rounded-full"
                style={{ boxShadow: `0 0 0 2px var(--color-soft), 0 0 0 3.5px ${teamHex}` }}
              >
                <Avatar player={current} size={28} />
              </span>
              <span className="max-w-[160px] truncate text-[15px] font-extrabold">{current.name}</span>
            </span>
          </div>
        ) : (
          <div className="flex h-[34px] items-center text-[13px] font-semibold text-muted">Filling an empty spot</div>
        )
      }
      subheader={
        <div className="px-4 pt-3">
          <FindPlayerInput value={query} onChange={setQuery} />
        </div>
      }
      fade
    >
      <PlayerGrid
        // The player being replaced is shown in the header, not in the grid.
        players={players.filter((p) => p.id !== shown?.currentId)}
        court={court}
        teamColors={teamColors}
        onPick={onPick}
        query={query}
        newPlayer={{ eyebrow: teamEyebrow, currentName: current?.name ?? '', onCreate }}
      />
    </BottomSheet>
  )
}

function PlayerGrid({
  players,
  court,
  teamColors,
  onPick,
  query,
  newPlayer,
}: {
  players: Player[]
  court: CourtState
  teamColors: Config['teamColors']
  onPick: (playerId: string) => void
  query: string
  newPlayer: { eyebrow: ReactNode; currentName: string; onCreate: (name: string, replace: boolean) => void }
}) {
  const [adding, setAdding] = useState(false)
  const shown = filterPlayers(players, query)
  const teamOf = (id: string) => TEAM_IDS.find((t) => court.teams[t].ids.includes(id))

  return (
    <div className="px-3 pt-2 pb-10">
      <ul className="grid grid-cols-3 gap-x-2 gap-y-1.5">
        {/* Always first, also while filtering (the filter text becomes the starting name). */}
        <li className="min-w-0">
          <NewPlayerTile onClick={() => setAdding(true)} />
        </li>
        {shown.map((player) => {
          const team = teamOf(player.id)
          const teamColor = team ? teamColors[team] : null
          return (
            <li key={player.id} className="min-w-0">
              <button
                type="button"
                onClick={() => onPick(player.id)}
                aria-label={teamColor ? `${player.name}, on court for Team ${titleCase(teamColor)}` : undefined}
                className={`${TILE_LG} active:bg-soft`}
              >
                <span
                  className="flex rounded-full"
                  style={{ boxShadow: teamColor ? `0 0 0 3px #fff, 0 0 0 5px ${TEAM_COLORS[teamColor]}` : undefined }}
                >
                  <Avatar player={player} size={60} />
                </span>
                <span
                  className="max-w-full truncate text-sm font-bold text-ink"
                >
                  {player.name}
                </span>
                {/* Always 18px tall so the rows line up. */}
                <span className="flex h-[18px] items-center">
                  {teamColor && (
                    <Tag style={{ backgroundColor: TEAM_TINTS[teamColor].bg, color: TEAM_TINTS[teamColor].fg }}>
                      {`TEAM ${teamColor.toUpperCase()}`}
                    </Tag>
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {shown.length === 0 && (
        <NoMatch query={query} />
      )}

      <NewPlayerDialog
        open={adding}
        onClose={() => setAdding(false)}
        players={players}
        initialName={query.trim()}
        eyebrow={newPlayer.eyebrow}
        primaryLabel={newPlayer.currentName ? `Add & replace ${newPlayer.currentName}` : 'Add & put on court'}
        onPrimary={(name) => {
          setAdding(false)
          newPlayer.onCreate(name, true)
        }}
        secondaryLabel="Just add to players"
        onSecondary={(name) => {
          setAdding(false)
          newPlayer.onCreate(name, false)
        }}
      />
    </div>
  )
}

function Tag({ style, children }: { style?: CSSProperties; children: string }) {
  return (
    <span
      aria-hidden
      className="flex h-[18px] items-center rounded-full px-2 text-[10px] font-extrabold tracking-[0.08em]"
      style={style}
    >
      {children}
    </span>
  )
}
