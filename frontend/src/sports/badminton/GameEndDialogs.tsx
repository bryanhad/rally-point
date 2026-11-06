import { useId, useRef, useState } from 'react'
import { DialogButton, DialogShell } from '../../components/ui/Dialog'
import { digits } from '../../components/ui/digits'
import { FlipDigits } from '../../components/ui/FlipDigits'
import { Avatar } from './Avatar'
import { otherTeam, type CourtState } from './game'
import { Crown } from './icons'
import { TEAM_COLORS, TEAM_TINTS, type Config, type HistoryEntry, type Player, type TeamColor, type TeamId } from './schema'

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const names = (players: Pick<Player, 'name'>[]) => players.map((p) => p.name).join(' & ')

// Keeps the last non-null value so a dialog's content stays put while it fades out.
function useLast<T>(value: T | null): T | null {
  const [last, setLast] = useState(value)
  if (value !== null && value !== last) setLast(value)
  return value ?? last
}

type GamePointDialogProps = {
  // The team that just reached the target; null when closed.
  team: TeamId | null
  court: CourtState
  byId: Map<string, Player>
  teamColors: Config['teamColors']
  totalPoints: number
  onEnd: (team: TeamId) => void
  onKeepPlaying: () => void
}

// Asked once, on the rally that reaches the target. A choice is required (no Escape).
export function GamePointDialog({ team, court, byId, teamColors, totalPoints, onEnd, onKeepPlaying }: GamePointDialogProps) {
  const shown = useLast(team)
  const titleId = useId()
  const endRef = useRef<HTMLButtonElement>(null)
  if (!shown) return null

  const color = teamColors[shown]
  const tint = TEAM_TINTS[color]
  const other = otherTeam(shown)
  const players = court.teams[shown].ids.map((id) => byId.get(id) ?? { id, name: '?' })

  return (
    <DialogShell open={team !== null} role="alertdialog" labelledBy={titleId} initialFocus={endRef} className="overflow-hidden">
      <div className="h-1.5" style={{ backgroundColor: TEAM_COLORS[color] }} />
      <div className="flex flex-col items-center gap-4 px-5 pt-[22px] pb-5 text-center">
        <div className="flex flex-col items-center gap-1.5">
          <div
            className="flex items-center gap-1.5 text-[11px] font-extrabold tracking-[0.22em]"
            style={{ color: tint.fg }}
          >
            <Crown className="h-3.5 w-4" />
            GAME POINT
          </div>
          <h2 id={titleId} className="text-[22px] font-extrabold">
            Team {titleCase(color)} reached {totalPoints}
          </h2>
        </div>

        <div className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3" style={{ backgroundColor: tint.bg }}>
          <div className="flex shrink-0">
            {players.map((p, i) => (
              <Avatar
                key={p.id}
                player={p}
                size={40}
                className={`border-[2.5px] ${i > 0 ? '-ml-3' : ''}`}
                style={{ borderColor: tint.bg }}
              />
            ))}
          </div>
          <div className="min-w-0 flex-1 truncate text-left text-[15px] font-extrabold" style={{ color: tint.fg }}>
            {names(players)}
          </div>
          <FlipDigits
            size="sm"
            className="shrink-0"
            label={`${court.teams[shown].score} to ${court.teams[other].score}`}
            tiles={[
              { value: court.teams[shown].score, marker: TEAM_COLORS[color] },
              { value: court.teams[other].score, marker: TEAM_COLORS[teamColors[other]], dim: true },
            ]}
          />
        </div>

        <p className="text-[15px] leading-[1.4] text-muted">End the game now, or keep playing?</p>
        <div className="flex w-full flex-col gap-2">
          <DialogButton ref={endRef} tone="ink" onClick={() => onEnd(shown)}>
            End game
          </DialogButton>
          <DialogButton onClick={onKeepPlaying}>Keep playing</DialogButton>
        </div>
        <p className="-mt-1.5 text-xs text-subtle">
          You can still end it later with <span className="font-bold text-muted">End game</span>.
        </p>
      </div>
    </DialogShell>
  )
}

// Team colour name from a history snapshot's hex ("Blue"), or null if the palette changed.
function colorName(hex: string | undefined): string | null {
  const name = (Object.keys(TEAM_COLORS) as TeamColor[]).find((c) => TEAM_COLORS[c] === hex)
  return name ? titleCase(name) : null
}

// Shown after a game is recorded. Escape and the overlay also mean "Next game".
export function GameWonDialog({ entry, onNext }: { entry: HistoryEntry | null; onNext: () => void }) {
  const shown = useLast(entry)
  const titleId = useId()
  const nextRef = useRef<HTMLButtonElement>(null)
  if (!shown) return null

  const draw = shown.winner === 'draw'
  const winner = draw ? shown.left : shown[shown.winner as 'left' | 'right']
  const loser = draw ? shown.right : shown[shown.winner === 'left' ? 'right' : 'left']
  const winnerName = colorName(winner.color)

  return (
    <DialogShell
      open={entry !== null}
      onDismiss={onNext}
      role="alertdialog"
      labelledBy={titleId}
      initialFocus={nextRef}
      className="overflow-hidden"
    >
      {/* Top half: the winner's colour inside a court-line frame (neutral grey for a draw). */}
      <div
        className={`relative flex flex-col items-center gap-3 px-5 pt-[22px] pb-5 text-center ${draw ? 'bg-soft text-ink' : 'text-white'}`}
        style={draw ? undefined : { backgroundColor: winner.color ?? 'var(--color-ink)' }}
      >
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-2.5 rounded-2xl border-[1.5px] ${draw ? 'border-line-strong' : 'border-white/25'}`}
        />
        {!draw && <Crown className="h-9 w-11" />}
        <div className="flex flex-col gap-1">
          <div className="text-[11px] font-extrabold tracking-[0.26em] opacity-85">GAME</div>
          <h2 id={titleId} className="text-2xl font-extrabold">
            {draw ? "It's a draw" : winnerName ? `Team ${winnerName} wins` : `${names(winner.players)} win`}
          </h2>
        </div>
        {!draw && (
          <div className="flex max-w-full gap-[18px] pt-0.5">
            {winner.players.map((p) => (
              <div key={p.id} className="flex min-w-0 flex-col items-center gap-1.5">
                <Avatar player={p} size={52} className="border-[3px] border-white" />
                <span className="max-w-28 truncate text-sm font-bold">{p.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-4 px-5 pt-[18px] pb-5">
        <div
          className="flex items-center gap-3"
          role="img"
          aria-label={`Final score ${winner.score} to ${loser.score}`}
        >
          <FlipDigits size="lg" tiles={digits(winner.score).map((d) => ({ value: d, marker: winner.color }))} />
          <span aria-hidden className="text-2xl font-extrabold text-faint">
            –
          </span>
          <FlipDigits
            size="lg"
            tiles={digits(loser.score).map((d) => ({ value: d, marker: loser.color, dim: !draw }))}
          />
        </div>

        {/* Draw: both teams stacked around "vs"; win: "vs" and the losers on one line. */}
        <div
          className={`flex max-w-full items-center justify-center text-sm text-muted ${draw ? 'flex-col gap-1' : 'gap-2'}`}
        >
          {draw && <Side side={winner} />}
          <span>vs</span>
          <Side side={loser} />
        </div>

        <DialogButton ref={nextRef} tone="ink" onClick={onNext}>
          Next game
        </DialogButton>
      </div>
    </DialogShell>
  )
}

// Small overlapping avatars, the names and a team dot.
function Side({ side }: { side: HistoryEntry['left'] }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="flex shrink-0">
        {side.players.map((p, i) => (
          <Avatar key={p.id} player={p} size={24} className={`border-2 border-white ${i > 0 ? '-ml-[7px]' : ''}`} />
        ))}
      </span>
      <span className="truncate font-semibold">{names(side.players)}</span>
      {side.color && <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: side.color }} />}
    </span>
  )
}
