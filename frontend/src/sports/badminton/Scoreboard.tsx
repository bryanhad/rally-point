import { Link } from '@tanstack/react-router'
import { useEffect, useState, type ReactNode } from 'react'
import toast from 'react-hot-toast'
import { BottomSheet } from '../../components/ui/BottomSheet'
import { writeLastSport } from '../../lib/lastSport'
import { ConfirmDialog, Dialog, DialogButton } from '../../components/ui/Dialog'
import { digits } from '../../components/ui/digits'
import { FlipDigits } from '../../components/ui/FlipDigits'
import { BandCaption, FrameCell, HeaderBand } from '../../components/ui/HeaderBand'
import {
  BackIcon,
  CheckIcon,
  FlagIcon,
  GearIcon,
  RedoIcon,
  ResetIcon,
  SwapIcon,
  TrophyIcon,
  UndoIcon,
} from '../../components/ui/icons'
import { Button, SectionLabel } from '../../components/ui/primitives'
import { Avatar } from './Avatar'
import { useBadminton } from './context'
import { Court, PlayerChip } from './Court'
import {
  allPlayers,
  canRedo,
  createHistoryEntry,
  describeRedo,
  describeUndo,
  hasRallies,
  otherTeam,
  replay,
  screenScore,
  serverId,
  TEAM_IDS,
  shouldSwitchSides,
  teamOn,
  type RallyStep,
  type SideKey,
} from './game'
import { HistorySheet } from './HistorySheet'
import { RallySheet } from './RallySheet'
import { Crown, Racket, Rackets, ServerIcon, SidesIcon } from './icons'
import { initials } from './initials'
import { TEAM_COLORS, type Config, type HistoryEntry, type Player, type SideSwitch, type TeamId } from './schema'

const SIDES: SideKey[] = ['left', 'right']

type PickerTarget = { team: TeamId; slot: number }

// Score after a rally in screen order after it, so a rally that switched ends shows the new order.
const scoreAfter = ({ after }: RallyStep) => screenScore(after)

export function Scoreboard() {
  const { game, court, steps, dispatch, config, setConfig, addHistoryEntry } = useBadminton()

  // Tracked by team because an automatic change of ends on the same point may move
  // them to the other side of the screen.
  const [matchPointTeam, setMatchPointTeam] = useState<TeamId | null>(null)
  const [winnerEntry, setWinnerEntry] = useState<HistoryEntry | null>(null)
  const [pendingMode, setPendingMode] = useState<Config['mode'] | null>(null)
  const [picker, setPicker] = useState<PickerTarget | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  // Which rally the detail sheet shows; kept while the sheet animates closed.
  const [rallyNumber, setRallyNumber] = useState<number | null>(null)
  const [rallyOpen, setRallyOpen] = useState(false)
  const [confirm, setConfirm] = useState<'end' | 'reset' | null>(null)

  // Remember badminton as the last sport played, for the home page's in-progress card.
  useEffect(() => writeLastSport('badminton'), [])

  const players = allPlayers(game)
  const byId = new Map(players.map((p) => [p.id, p]))
  const started = hasRallies(game)

  function rally(team: TeamId) {
    const score = court.teams[team].score + 1
    const rules = { totalPoints: config.totalPoints, sideSwitch: config.sideSwitch }
    if (score === config.totalPoints) setMatchPointTeam(team)
    const otherScore = court.teams[otherTeam(team)].score
    if (shouldSwitchSides(score, otherScore, rules)) toast(`Players switched sides (reached ${score})`)
    dispatch({
      type: 'rally',
      team,
      // oxlint-disable-next-line react/purity -- only called from a click handler, not during render
      at: Date.now(),
      rules,
    })
  }

  const nameOf = (id: string) => byId.get(id)?.name ?? '?'

  function undo() {
    const last = steps.at(-1)
    if (!last) return
    dispatch({ type: 'undo' })
    toast(describeUndo(last, nameOf))
  }

  function redo() {
    if (!canRedo(game)) return
    // Replay the saved copy to describe the entry that is about to come back.
    const next = replay({ ...game, log: game.redoLog! }).steps[game.log.length]
    dispatch({ type: 'redo' })
    toast(describeRedo(next, nameOf))
  }

  function finishGame(winner: TeamId | 'draw') {
    const entry = createHistoryEntry(court, players, winner, config.teamColors, config.totalPoints)
    addHistoryEntry(entry)
    // Start the next game right away so the same game can't be recorded twice.
    dispatch({ type: 'newGame' })
    setMatchPointTeam(null)
    setConfirm(null)
    setWinnerEntry(entry)
  }

  const { a, b } = court.teams
  const reachedTotal = Math.max(a.score, b.score) >= config.totalPoints
  const leader: TeamId | 'draw' = a.score === b.score ? 'draw' : a.score > b.score ? 'a' : 'b'
  const teamNames = (team: TeamId) =>
    court.teams[team].ids.map((id) => byId.get(id)?.name ?? '?').join(' & ')
  const scoreText = `${court.teams[teamOn(court, 'left')].score}–${court.teams[teamOn(court, 'right')].score}`

  function requestMode(mode: Config['mode']) {
    if (mode === config.mode) return
    if (started) setPendingMode(mode)
    else applyMode(mode)
  }

  function applyMode(mode: Config['mode']) {
    setConfig((c) => ({ ...c, mode }))
    dispatch({ type: 'setMode', mode })
    setPendingMode(null)
  }

  const matchPointNames = matchPointTeam
    ? court.teams[matchPointTeam].ids.map((id) => byId.get(id)?.name ?? '?').join(' & ')
    : ''
  const winnerSide =
    winnerEntry && winnerEntry.winner !== 'draw' ? winnerEntry[winnerEntry.winner] : null
  const pickedId = picker ? court.teams[picker.team].ids[picker.slot] : null
  // Rallies only, numbered in play order, newest first for the strip.
  const chronological = steps
    .filter((s): s is RallyStep => s.event.type === 'rally')
    .map((step, i) => ({ step, number: i + 1 }))
  const rallies = [...chronological].reverse()
  // Which team each on-court player belongs to (for the picker's indicator).
  const teamOfPlayer = new Map<string, TeamId>(TEAM_IDS.flatMap((t) => court.teams[t].ids.map((id) => [id, t] as const)))

  const colorName = (team: TeamId) => {
    const name = config.teamColors[team]
    return name.charAt(0).toUpperCase() + name.slice(1)
  }
  const teamInitials = (team: TeamId) => court.teams[team].ids.map((id) => initials(nameOf(id))).join(' · ')
  const newestRally = rallies[0]?.number

  return (
    <div className="flex flex-1 flex-col">
      <HeaderBand
        title="BADMINTON"
        left={
          <Link to="/" aria-label="Back to home" className={BAND_ICON_LINK}>
            <BackIcon />
          </Link>
        }
        right={
          <Link to="/sports/badminton/config" aria-label="Badminton settings" className={BAND_ICON_LINK}>
            <GearIcon />
          </Link>
        }
      >
        <FrameCell className="flex h-[58px] items-center gap-2 px-3">
          <FlipDigits tiles={digits(config.totalPoints)} size="xs" label={`${config.totalPoints} points to win`} />
          <BandCaption>
            POINTS
            <br />
            TO WIN
          </BandCaption>
        </FrameCell>
        <FrameCell divider className="flex min-w-0 flex-1 items-center justify-end px-3">
          <AutoSwapStatus sideSwitch={config.sideSwitch} totalPoints={config.totalPoints} />
        </FrameCell>
      </HeaderBand>

      <div className="flex flex-1 flex-col px-3 pt-2.5 pb-[max(12px,env(safe-area-inset-bottom))]">
        {/* Court layout controls: match type on the left, side/serve swaps on the right */}
        <div className="mb-2 flex h-11 shrink-0 items-center justify-between">
          <div role="group" aria-label="Match type" className="flex h-11 rounded-control bg-soft p-[3px]">
            {(['singles', 'doubles'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => requestMode(mode)}
                aria-label={mode === 'singles' ? 'Singles' : 'Doubles'}
                aria-pressed={config.mode === mode}
                className={`flex w-12 items-center justify-center rounded-[9px] ${config.mode === mode ? 'bg-white text-ink shadow-[0_1px_3px_rgba(20,26,38,0.15)]' : 'text-muted'}`}
              >
                {mode === 'singles' ? <Racket /> : <Rackets />}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            <Button
              aria-label="Swap player sides"
              icon={<SidesIcon />}
              label="Sides"
              onClick={() => {
                dispatch({ type: 'swapEnds', at: Date.now() })
                toast('Players switched sides')
              }}
            />
            <Button
              aria-label="Swap server side"
              icon={<ServerIcon />}
              label="Server"
              disabled={started}
              onClick={() => {
                dispatch({ type: 'switchServer' })
                toast('Serve switched to the other side')
              }}
            />
          </div>
        </div>

        <Court
          court={court}
          byId={byId}
          colors={config.teamColors}
          onPick={(team, slot) => setPicker({ team, slot })}
          // Only before the first rally; Court hides it for singles.
          onSwapPartners={started ? undefined : (team) => dispatch({ type: 'swapPartners', team })}
        />

        {/* Game actions: history controls on the left, reset/end on the right */}
        <div className="mb-2 flex shrink-0 items-center justify-between">
          <div className="flex gap-1.5">
            <Button icon={<UndoIcon />} label="Undo" onClick={undo} disabled={game.log.length === 0} />
            <Button aria-label="Redo" icon={<RedoIcon />} onClick={redo} disabled={!canRedo(game)} />
          </div>
          <div className="flex gap-1.5">
            <Button
              aria-label="Reset game"
              icon={<ResetIcon />}
              onClick={() => setConfirm('reset')}
              disabled={game.log.length === 0}
            />
            {/* Only once a team has reached the total (e.g. after choosing Keep playing). */}
            <button
              type="button"
              onClick={() => setConfirm('end')}
              disabled={!reachedTotal}
              title={reachedTotal ? undefined : `Available once a team reaches ${config.totalPoints}`}
              className="flex h-11 items-center gap-1.5 rounded-control bg-ink px-3 text-[13px] font-bold text-white active:opacity-75 disabled:border-[1.5px] disabled:border-dashed disabled:border-line-strong disabled:bg-white disabled:text-faint"
            >
              <FlagIcon />
              End game
            </button>
          </div>
        </div>

        {/* Scores: tapping a side records a rally won by the team on that side */}
        <div className="flex min-h-20 flex-1 gap-2.5">
          {SIDES.map((side) => {
            const team = teamOn(court, side)
            return (
              <button
                key={side}
                type="button"
                onClick={() => rally(team)}
                aria-label={`Point to Team ${colorName(team)}`}
                className="flex flex-1 flex-col items-center justify-center gap-1 rounded-[22px] text-white select-none active:opacity-85"
                style={{ backgroundColor: TEAM_COLORS[config.teamColors[team]], containerType: 'size' }}
              >
                <span
                  className="text-[min(52cqh,44cqw)] leading-none tabular-nums"
                  style={{ fontWeight: config.thickness }}
                >
                  {court.teams[team].score}
                </span>
                <span className="text-xs font-bold tracking-[0.14em] opacity-90">{teamInitials(team)}</span>
              </button>
            )
          })}
        </div>

        {/* Rallies strip (newest on the left); match history opens in a sheet */}
        <div className="mt-1.5 flex shrink-0 flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-bold tracking-[0.06em] text-muted">RALLIES</h2>
            <Button
              tone="ghost"
              className="px-2 text-band-ink"
              icon={<TrophyIcon />}
              label="Match history"
              onClick={() => setHistoryOpen(true)}
            />
          </div>
          {rallies.length > 0 ? (
            <div className="scrollbar-always flex gap-1.5 overflow-x-auto p-1 pb-1.5">
              {rallies.map(({ step, number }) => (
                <button
                  key={number}
                  type="button"
                  onClick={() => {
                    setRallyNumber(number)
                    setRallyOpen(true)
                  }}
                  aria-label={`Rally ${number}: ${scoreAfter(step)}`}
                  className={`flex h-8 shrink-0 items-center rounded-[9px] px-3 text-sm font-extrabold text-white tabular-nums active:opacity-80 ${
                    number === newestRally ? 'shadow-[0_0_0_2px_#fff,0_0_0_4px_var(--color-ink)]' : ''
                  }`}
                  style={{ backgroundColor: TEAM_COLORS[config.teamColors[step.event.winner]] }}
                >
                  {scoreAfter(step)}
                </button>
              ))}
            </div>
          ) : (
            <p className="flex h-10 items-center text-sm text-faint">No rallies yet</p>
          )}
        </div>
      </div>

      <Dialog
        open={matchPointTeam !== null}
        badge={<Crown className="h-6 w-7" />}
        badgeTone="gold"
        title="Game point!"
        description={
          <>
            <strong className="text-ink">{matchPointNames}</strong> reached{' '}
            <strong className="text-ink">{config.totalPoints}</strong>.
            <br />
            End the game or keep playing?
          </>
        }
        actions={
          <>
            <DialogButton tone="ink" onClick={() => matchPointTeam && finishGame(matchPointTeam)}>
              End game
            </DialogButton>
            <DialogButton onClick={() => setMatchPointTeam(null)}>Keep playing</DialogButton>
          </>
        }
      />

      <Dialog
        open={winnerEntry !== null}
        onDismiss={() => setWinnerEntry(null)}
        badge={winnerSide ? <Crown className="h-6 w-7" /> : <FlagIcon size={26} />}
        badgeTone={winnerSide ? 'gold' : 'accent'}
        title={winnerSide ? 'Game!' : "It's a draw!"}
        description={
          winnerSide ? (
            <>
              <strong className="text-ink">{winnerSide.players.map((p) => p.name).join(' & ')}</strong> win the game.
            </>
          ) : (
            'Nobody takes the crown this time.'
          )
        }
        actions={
          <DialogButton tone="ink" onClick={() => setWinnerEntry(null)}>
            Next game
          </DialogButton>
        }
      >
        {winnerEntry && (
          <FlipDigits
            size="lg"
            label={`Final score ${winnerEntry.left.score} to ${winnerEntry.right.score}`}
            tiles={[
              { value: winnerEntry.left.score, marker: winnerEntry.left.color },
              { value: winnerEntry.right.score, marker: winnerEntry.right.color },
            ]}
          />
        )}
      </Dialog>

      <ConfirmDialog
        open={pendingMode !== null}
        tone="neutral"
        icon={pendingMode === 'doubles' ? <Rackets className="h-6 w-7" /> : <Racket className="size-6" />}
        title={`Switch to ${pendingMode}?`}
        description={
          <>
            The current game at <strong className="text-ink">{scoreText}</strong> restarts from 0–0.
          </>
        }
        confirmLabel={`Switch to ${pendingMode}`}
        cancelLabel="Keep this game"
        onConfirm={() => pendingMode && applyMode(pendingMode)}
        onCancel={() => setPendingMode(null)}
      />

      <BottomSheet
        open={picker !== null}
        onClose={() => setPicker(null)}
        eyebrow={picker ? `Team ${colorName(picker.team)}` : ''}
        title="Change player"
        fullHeight
      >
        <PlayerPicker
          players={players}
          teamOfPlayer={teamOfPlayer}
          colors={config.teamColors}
          current={
            picker && pickedId ? (
              // Read-only copy of the chip that was tapped.
              <PlayerChip
                name={nameOf(pickedId)}
                half="left"
                color={TEAM_COLORS[config.teamColors[picker.team]]}
                serving={pickedId === serverId(court)}
                // The receiver's solid white ring would vanish on the white sheet.
                receiving={false}
                crowned={false}
                showShuttle={false}
              />
            ) : null
          }
          onSelect={(playerId) => {
            if (picker) dispatch({ type: 'assignPlayer', ...picker, playerId, at: Date.now() })
            setPicker(null)
          }}
        />
      </BottomSheet>

      <ConfirmDialog
        open={confirm === 'end'}
        tone="neutral"
        icon={<FlagIcon size={26} />}
        title="End the current game?"
        description={
          leader === 'draw' ? (
            <>
              Level at <strong className="text-ink">{scoreText}</strong>. It goes into match history as a draw.
            </>
          ) : (
            <>
              <strong className="text-ink">{teamNames(leader)}</strong> take it{' '}
              <strong className="text-ink">{scoreText}</strong>, and it goes into match history.
            </>
          )
        }
        confirmLabel="End game"
        cancelLabel="Keep playing"
        onConfirm={() => finishGame(leader)}
        onCancel={() => setConfirm(null)}
      />

      <ConfirmDialog
        open={confirm === 'reset'}
        icon={<ResetIcon size={26} />}
        title="Restart this game?"
        description={
          <>
            The score goes from <strong className="text-ink">{scoreText}</strong> back to 0–0. It won&apos;t be saved
            to match history.
          </>
        }
        confirmLabel="Restart game"
        cancelLabel="Keep playing"
        onConfirm={() => {
          dispatch({ type: 'restart' })
          setConfirm(null)
        }}
        onCancel={() => setConfirm(null)}
      />

      <RallySheet
        open={rallyOpen}
        rallies={chronological}
        number={rallyNumber}
        onNavigate={setRallyNumber}
        onClose={() => setRallyOpen(false)}
        byId={byId}
        colors={config.teamColors}
      />

      <HistorySheet open={historyOpen} onClose={() => setHistoryOpen(false)} />

    </div>
  )
}

const BAND_ICON_LINK = 'flex size-11 items-center justify-center rounded-control text-white active:bg-white/15'

// Header status for the automatic side switch: the rule plus an ON/OFF pill.
function AutoSwapStatus({ sideSwitch, totalPoints }: { sideSwitch: SideSwitch; totalPoints: number }) {
  const on = sideSwitch.kind !== 'off'
  const text =
    sideSwitch.kind === 'off'
      ? 'Off'
      : sideSwitch.kind === 'half'
        ? `At ${Math.ceil(totalPoints / 2)} pts`
        : `Every ${sideSwitch.points} pts`
  return (
    <div className="flex min-w-0 flex-col items-end gap-1">
      <BandCaption>AUTO SWAP SIDES</BandCaption>
      <div className="flex h-5 min-w-0 items-center gap-1.5 text-sm leading-none font-bold">
        <SwapIcon className="shrink-0" />
        <span className="truncate">{text}</span>
        <span
          className={`inline-flex h-[18px] items-center rounded-full px-[7px] text-[10px] leading-none font-extrabold tracking-[0.08em] ${
            on ? 'bg-flip-digit text-ink' : 'bg-white/20 text-white'
          }`}
        >
          {on ? 'ON' : 'OFF'}
        </span>
      </div>
    </div>
  )
}

// Body of the player picker sheet. It unmounts with the sheet, so the filter starts empty each time.
function PlayerPicker({
  players,
  teamOfPlayer,
  colors,
  current,
  onSelect,
}: {
  players: Player[]
  teamOfPlayer: Map<string, TeamId>
  colors: Config['teamColors']
  current: ReactNode
  onSelect: (playerId: string) => void
}) {
  const [query, setQuery] = useState('')
  const needle = query.trim().toLowerCase()
  const shown = needle ? players.filter((p) => p.name.toLowerCase().includes(needle)) : players

  return (
    <div className="px-4 pb-6">
      <div className="flex min-w-0 items-center justify-between gap-3 pt-4">
        <SectionLabel className="px-1 text-[11px]">Current</SectionLabel>
        <div className="pointer-events-none flex min-w-0 justify-end">{current}</div>
      </div>
      {/* Stays at the top while the grid scrolls. */}
      <div className="sticky top-0 z-10 bg-white pt-5 pb-3">
        <SectionLabel className="mb-2 px-1 text-[11px]">Replace with</SectionLabel>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by name"
          aria-label="Filter players by name"
          autoComplete="off"
          className="h-11 w-full rounded-control bg-soft px-3 text-base outline-none placeholder:text-subtle focus-visible:ring-2 focus-visible:ring-band"
        />
      </div>
      {shown.length === 0 ? (
        <p className="px-1 py-6 text-center text-sm text-muted">No players match “{query.trim()}”</p>
      ) : (
        <ul className="grid grid-cols-3 gap-x-1 gap-y-2">
          {shown.map((player) => {
            const team = teamOfPlayer.get(player.id)
            const teamColor = team ? TEAM_COLORS[colors[team]] : null
            return (
              <li key={player.id} className="min-w-0">
                <button
                  type="button"
                  onClick={() => onSelect(player.id)}
                  className="flex min-h-[104px] w-full flex-col items-center gap-2 rounded-card px-1 pt-3 pb-2 active:bg-soft"
                >
                  {/* On-court players get a ring and check badge in their team's colour. */}
                  <span
                    className="relative flex rounded-full"
                    style={teamColor ? { boxShadow: `0 0 0 2px #fff, 0 0 0 4.5px ${teamColor}` } : undefined}
                  >
                    <Avatar name={player.name} size={52} />
                    {teamColor && (
                      <span
                        className="absolute -right-1 -bottom-1 flex size-[20px] items-center justify-center rounded-full border-2 border-white text-white"
                        style={{ backgroundColor: teamColor }}
                      >
                        <CheckIcon size={10} />
                      </span>
                    )}
                  </span>
                  <span className="line-clamp-2 w-full text-center text-[13px] leading-tight font-semibold break-words">
                    {player.name}
                  </span>
                  {team && <span className="sr-only">On court, Team {colors[team].charAt(0).toUpperCase() + colors[team].slice(1)}</span>}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
