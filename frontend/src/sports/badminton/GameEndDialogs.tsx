import { useEffect, useId, useRef, useState } from 'react'
import { DialogButton, DialogShell } from '../../components/ui/Dialog'
import { Avatar } from './Avatar'
import { otherTeam, type CourtState } from './game'
import { Medal, WhistleArt } from './icons'
import { startRain } from './confetti'
import { TEAM_COLORS, type Config, type HistoryEntry, type Player, type TeamId } from './schema'
import { colorFromHex, teamName } from './scoreboardView'
import { TeamScorePair, TeamScoreTile, type TeamScore } from './TeamScore'

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const names = (players: Pick<Player, 'name'>[]) => players.map((p) => p.name).join(' & ')

// Keeps the last non-null value so a dialog's content stays put while it fades out.
function useLast<T>(value: T | null): T | null {
  const [last, setLast] = useState(value)
  if (value !== null && value !== last) setLast(value)
  return value ?? last
}

type TargetReachedDialogProps = {
  // The team whose tap just won the game; null when closed.
  team: TeamId | null
  court: CourtState
  byId: Map<string, Player>
  teamColors: Config['teamColors']
  onEnd: (team: TeamId) => void
  onKeepPlaying: () => void
}

// The end-of-game confirmation, on the tap that wins the game: neutral (nobody crowned yet).
// The scorer confirms it or backs out to fix a mistaken tap. A choice is required (no Escape).
export function TargetReachedDialog({ team, court, byId, teamColors, onEnd, onKeepPlaying }: TargetReachedDialogProps) {
  const shown = useLast(team)
  const labelId = useId()
  const subId = useId()
  const endRef = useRef<HTMLButtonElement>(null)
  if (!shown) return null

  const other = otherTeam(shown)
  const score = court.teams[shown].score
  const teamLabel = teamName(teamColors[shown])
  const row = (t: TeamId) => ({
    team: t,
    color: teamColors[t],
    players: court.teams[t].ids.map((id) => byId.get(id) ?? { id, name: '?' }),
  })

  return (
    <DialogShell
      open={team !== null}
      role="alertdialog"
      labelledBy={labelId}
      describedBy={subId}
      initialFocus={endRef}
      className="overflow-hidden"
    >
      <span id={labelId} className="sr-only">
        {score} reached. {teamLabel} got there first
      </span>
      {/* Referee stripes on the left fading into the dark, the whistle bottom-left (clipped by
          the header), the reached score bottom-right. */}
      <div className="relative h-[176px] shrink-0 overflow-hidden bg-[#1E2636]">
        <div
          aria-hidden
          className="absolute inset-0 bg-[repeating-linear-gradient(90deg,#FFFFFF_0_22px,transparent_22px_44px)] [mask-image:linear-gradient(90deg,#000_0%,#000_22%,transparent_52%)]"
        />
        <svg aria-hidden width={358} height={176} viewBox="0 0 358 176" className="absolute top-0 left-0">
          <g transform="translate(46 164) scale(0.74)">
            <WhistleArt />
          </g>
        </svg>
        <div className="absolute right-[26px] bottom-[22px] text-right text-white">
          <div className="flex flex-col items-end">
            <span className="text-[56px] leading-[0.9] font-black tracking-[-0.01em] tabular-nums">{score}</span>
            <span className="mt-0.5 text-[22px] font-black tracking-[0.12em]">REACHED</span>
          </div>
          <div id={subId} className="mt-1.5 text-[13px] font-bold text-white/72">
            {teamLabel} got there first
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3.5 px-5 pt-4 pb-5">
        {/* Both teams as equal rows, winner first; only the name weight tells them apart. */}
        <div className="rounded-2xl border-[1.5px] border-line">
          {[row(shown), row(other)].map((r, i) => (
            <div key={r.team}>
              {i > 0 && <div className="mx-3 h-px bg-soft" />}
              <div className="flex items-center gap-2.5 px-3 py-2.5">
                <div className="flex shrink-0">
                  {r.players.map((p, j) => (
                    <Avatar key={p.id} player={p} size={32} className={`border-2 border-white ${j > 0 ? '-ml-2.5' : ''}`} />
                  ))}
                </div>
                <div
                  className={`min-w-0 flex-1 truncate text-[15px] ${i === 0 ? 'font-extrabold text-ink' : 'font-bold text-muted'}`}
                >
                  {names(r.players)}
                </div>
                <TeamScoreTile size="sm" color={r.color} score={court.teams[r.team].score} name={teamName(r.color)} />
              </div>
            </div>
          ))}
        </div>

        {/* End game is the likely tap: the bigger target, under the right thumb. */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onKeepPlaying}
            className="h-[52px] flex-1 rounded-[14px] bg-soft px-2 text-sm font-bold whitespace-nowrap text-ink active:opacity-80"
          >
            Keep playing
          </button>
          <button
            ref={endRef}
            type="button"
            onClick={() => onEnd(shown)}
            className="h-[52px] flex-[1.75] rounded-[14px] bg-ink text-base font-extrabold text-white active:opacity-80"
          >
            End game
          </button>
        </div>
        <p className="-mt-1 text-center text-xs text-subtle">
          Scored by mistake? Tap <span className="font-bold text-muted">Keep playing</span>, then{' '}
          <span className="font-bold text-muted">Undo</span>.
        </p>
      </div>
    </DialogShell>
  )
}

// A history side as a score tile: its palette colour (slate when the saved colour is missing or
// no longer in the palette), named by team colour or else by its players.
function sideScore(side: HistoryEntry['left'], tone: TeamScore['tone']): TeamScore {
  const color = colorFromHex(side.color)
  return { color: color ?? 'slate', score: side.score, name: color ? teamName(color) : names(side.players), tone }
}

// Confetti rain for a game won (not a draw), from shortly after the dialog opens until it
// closes. The start timer is cancelled if the effect is cleaned up first, so React StrictMode's
// dev double-run starts it once; re-renders don't restart it.
function useConfetti(entry: HistoryEntry | null) {
  useEffect(() => {
    if (!entry || entry.winner === 'draw') return
    let stop: (() => void) | null = null
    const timer = setTimeout(() => {
      stop = startRain()
    }, 120)
    return () => {
      clearTimeout(timer)
      stop?.()
    }
  }, [entry])
}

// Shown after a game is recorded. Escape and the overlay also mean "Next game".
export function GameWonDialog({ entry, onNext }: { entry: HistoryEntry | null; onNext: () => void }) {
  const shown = useLast(entry)
  const titleId = useId()
  const nextRef = useRef<HTMLButtonElement>(null)
  useConfetti(entry)
  if (!shown) return null

  const draw = shown.winner === 'draw'
  const winner = draw ? shown.left : shown[shown.winner as 'left' | 'right']
  const loser = draw ? shown.right : shown[shown.winner === 'left' ? 'right' : 'left']
  const winnerColor = colorFromHex(winner.color)
  const winnerName = winnerColor ? titleCase(winnerColor) : null

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
        {/* The medal in a soft double halo, like Game point's. */}
        {!draw && (
          <span className="flex size-[76px] shrink-0 items-center justify-center rounded-full bg-white/16 shadow-[0_0_0_10px_rgba(255,255,255,0.07)]">
            <Medal teamColor={winner.color ?? TEAM_COLORS.slate} className="h-11 w-[37px]" />
          </span>
        )}
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
        {/* Final result: the loser's tile in its tint; a draw keeps both solid. */}
        <TeamScorePair
          size="lg"
          scores={[sideScore(winner, 'solid'), sideScore(loser, draw ? 'solid' : 'loser')]}
          label={draw ? `Draw, ${winner.score} all` : undefined}
        />

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
