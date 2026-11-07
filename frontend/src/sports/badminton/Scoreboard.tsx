import { Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { newId } from '../../lib/id'
import { writeLastSport } from '../../lib/lastSport'
import { ConfirmDialog, Dialog, DialogButton } from '../../components/ui/Dialog'
import { digits } from '../../components/ui/digits'
import { FlipDigits } from '../../components/ui/FlipDigits'
import { BandTile, HeaderBand } from '../../components/ui/HeaderBand'
import {
  AlertIcon,
  BackIcon,
  ClockIcon,
  ChevronRightIcon,
  PlusIcon,
  UserPlusIcon,
  EditIcon,
  FlagIcon,
  GearIcon,
  RedoIcon,
  ResetIcon,
  SwapIcon,
  TrophyIcon,
  UndoIcon,
} from '../../components/ui/icons'
import { Button } from '../../components/ui/primitives'
import { Avatar } from './Avatar'
import { useBadminton } from './context'
import { Court } from './Court'
import {
  allPlayers,
  canRedo,
  createHistoryEntry,
  describeRedo,
  describeUndo,
  EMPTY_SLOT,
  hasEmptySlot,
  hasRallies,
  otherTeam,
  replay,
  screenScore,
  shouldSwitchSides,
  sortByName,
  TEAM_IDS,
  teamOn,
  type RallyStep,
  type SideKey,
} from './game'
import { ChangePlayerSheet, type PickerTarget } from './ChangePlayerSheet'
import { GamePointDialog, GameWonDialog } from './GameEndDialogs'
import { GameRulesSheet } from './GameRulesSheet'
import { HistorySheet } from './HistorySheet'
import { ManagePlayersSheet } from './ManagePlayersSheet'
import { RallySheet } from './RallySheet'
import { dayLabel, isIdle, nextGameNumber, sessionDateLabel, timeLabel } from './session'
import { PickPlayersDialog } from './PickPlayersDialog'
import { MIN_PLAYERS } from './playerList'
import { SessionSheet } from './SessionSheet'
import { NewSessionDialog } from './NewSessionDialog'
import { SessionPlayersDialog } from './SessionPlayersDialog'
import { GameCountsDialog } from './GameCountsDialog'
import { Racket, Rackets, ServerIcon, SidesIcon } from './icons'
import { initials } from './avatarStyle'
import {
  TEAM_COLORS,
  type Config,
  type HistoryEntry,
  type Player,
  type Session,
  type SideSwitch,
  type TeamId,
} from './schema'

const SIDES: SideKey[] = ['left', 'right']


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
  const [rulesOpen, setRulesOpen] = useState(false)
  const [playersOpen, setPlayersOpen] = useState(false)
  const [sessionOpen, setSessionOpen] = useState(false)
  const [newSessionOpen, setNewSessionOpen] = useState(false)
  const [sessionPlayersOpen, setSessionPlayersOpen] = useState(false)
  const [countsOpen, setCountsOpen] = useState(false)
  const [pickOpen, setPickOpen] = useState(false)
  // "Not enough players" for doubles, and whether to switch once players are added.
  const [needsPlayers, setNeedsPlayers] = useState(false)
  const [doublesAfterPick, setDoublesAfterPick] = useState(false)
  // 12-hour prompt: checked on opening and whenever the app comes back to the front.
  const [idle, setIdle] = useState(() => isIdle(game))
  const gameRef = useRef(game)
  useEffect(() => {
    gameRef.current = game
  }, [game])
  useEffect(() => {
    const check = () => {
      if (document.visibilityState === 'visible') setIdle(isIdle(gameRef.current))
    }
    document.addEventListener('visibilitychange', check)
    return () => document.removeEventListener('visibilitychange', check)
  }, [])

  // Remember badminton as the last sport played, for the home page's in-progress card.
  useEffect(() => writeLastSport('badminton'), [])

  const players = allPlayers(game)
  const byId = new Map(players.map((p) => [p.id, p]))
  const started = hasRallies(game)
  const session = game.sessions.current
  // Between games in a session: the court waits for this game's players.
  const pickPending = !!session && game.awaitingPick
  // The court is covered (no session, or picking): game controls are off.
  const blocked = !session || pickPending
  // Last game's lineup, for "Same players": only once a game has been played, and only if
  // everyone on it is still in the session.
  const lineupIds = [...court.teams[court.leftTeam].ids, ...court.teams[otherTeam(court.leftTeam)].ids]
  const sameLineup =
    session && session.games.length > 0 && lineupIds.every((id) => id !== EMPTY_SLOT && session.playerIds.includes(id))
      ? lineupIds.map((id) => byId.get(id)).filter((p): p is Player => !!p)
      : null
  // Scoring (and ending the game) waits until every spot on court has a player.
  const emptySpot = hasEmptySlot(court)

  function rally(team: TeamId) {
    // Play happens inside a session: without one, a score tap starts one.
    if (!session) return setNewSessionOpen(true)
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

  // Change player sheet: the teammate swaps partners (the same move as the court's swap
  // button), anyone else is put in (swapping if on court). The current player isn't listed, so
  // picking them is only guarded against.
  function pickPlayer(playerId: string) {
    if (!picker) return
    const ids = court.teams[picker.team].ids
    if (playerId === ids[picker.slot]) {
      // nothing to change
    } else if (ids.includes(playerId)) {
      dispatch({ type: 'swapPartners', team: picker.team, at: Date.now() })
    } else {
      dispatch({ type: 'assignPlayer', ...picker, playerId, at: Date.now() })
    }
    setPicker(null)
  }

  // Saves a new player and returns their id.
  function savePlayer(name: string) {
    const id = newId()
    dispatch({ type: 'addPlayer', id, name })
    return id
  }

  // New player from the Change player sheet: always saved, and joins the running session;
  // "Add & replace" also puts them in the slot and closes the sheet, "Just add" leaves it open.
  function createPlayer(name: string, replace: boolean) {
    const id = savePlayer(name)
    if (session) dispatch({ type: 'setSessionPlayers', playerIds: [...session.playerIds, id] })
    if (replace && picker) {
      dispatch({ type: 'assignPlayer', ...picker, playerId: id, at: Date.now() })
      setPicker(null)
    }
  }

  function redo() {
    if (!canRedo(game)) return
    // Replay the saved copy to describe the entry that is about to come back.
    const next = replay({ ...game, log: game.redoLog! }).steps[game.log.length]
    dispatch({ type: 'redo' })
    toast(describeRedo(next, nameOf))
  }

  function finishGame(winner: TeamId | 'draw') {
    const entry = createHistoryEntry(
      court,
      players,
      winner,
      config.teamColors,
      config.totalPoints,
      game.sessions.current?.id,
    )
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
    // A session needs enough players for doubles first.
    if (mode === 'doubles' && session && session.playerIds.length < MIN_PLAYERS.doubles) return setNeedsPlayers(true)
    switchMode(mode)
  }

  // Mid-game, confirm first (the game restarts).
  function switchMode(mode: Config['mode']) {
    if (started) setPendingMode(mode)
    else applyMode(mode)
  }

  function applyMode(mode: Config['mode']) {
    setConfig((c) => ({ ...c, mode }))
    dispatch({ type: 'setMode', mode })
    setPendingMode(null)
  }

  // Rallies only, numbered in play order, newest first for the strip.
  const chronological = steps
    .filter((s): s is RallyStep => s.event.type === 'rally')
    .map((step, i) => ({ step, number: i + 1 }))
  const rallies = [...chronological].reverse()

  const colorName = (team: TeamId) => {
    const name = config.teamColors[team]
    return name.charAt(0).toUpperCase() + name.slice(1)
  }
  const teamInitials = (team: TeamId) =>
    court.teams[team].ids.map((id) => (id === EMPTY_SLOT ? '?' : initials(nameOf(id)))).join(' · ')
  const newestRally = rallies[0]?.number

  return (
    <div className="flex flex-1 flex-col">
      <HeaderBand
        title="BADMINTON"
        framed={false}
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
        <SessionTile session={session} players={game.players} onClick={() => setSessionOpen(true)} />
        <BandTile
          className="shrink-0 gap-2.5"
          onClick={() => setRulesOpen(true)}
          aria-label={`Game rules: ${config.totalPoints} points to win, ${swapRuleLabel(config.sideSwitch)}. Edit`}
          icon={<EditIcon size={13} />}
        >
          <FlipDigits tiles={digits(config.totalPoints)} size="xs" />
          <div className="flex min-w-0 flex-col gap-[5px]">
            <div className={TILE_CAPTION}>POINTS TO WIN</div>
            <AutoSwapStatus sideSwitch={config.sideSwitch} />
          </div>
        </BandTile>
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
          onSwapPartners={started ? undefined : (team) => dispatch({ type: 'swapPartners', team, at: Date.now() })}
          overlay={
            !session ? (
              <NoSessionOverlay onStart={() => setNewSessionOpen(true)} />
            ) : pickPending ? (
              <PickOverlay
                gameNumber={nextGameNumber(session)}
                same={sameLineup}
                onPick={() => setPickOpen(true)}
                onSame={() => dispatch({ type: 'startGame' })}
              />
            ) : undefined
          }
        />

        {/* Game actions: history controls on the left, reset/end on the right */}
        <div className="mb-2 flex shrink-0 items-center justify-between">
          <div className="flex gap-1.5">
            <Button icon={<UndoIcon />} label="Undo" onClick={undo} disabled={blocked || game.log.length === 0} />
            <Button aria-label="Redo" icon={<RedoIcon />} onClick={redo} disabled={blocked || !canRedo(game)} />
          </div>
          <div className="flex gap-1.5">
            <Button
              aria-label="Reset game"
              icon={<ResetIcon />}
              onClick={() => setConfirm('reset')}
              disabled={blocked || game.log.length === 0}
            />
            {/* Only once a team has reached the total (e.g. after choosing Keep playing). */}
            <button
              type="button"
              onClick={() => setConfirm('end')}
              disabled={blocked || !reachedTotal || emptySpot}
              title={reachedTotal ? undefined : `Available once a team reaches ${config.totalPoints}`}
              className="flex h-11 items-center gap-1.5 rounded-control bg-ink px-3 text-[13px] font-bold text-white active:opacity-75 disabled:border-[1.5px] disabled:border-dashed disabled:border-line-strong disabled:bg-white disabled:text-faint"
            >
              <FlagIcon />
              End game
            </button>
          </div>
        </div>

        {!blocked && emptySpot && (
          <p className="-mt-0.5 mb-1.5 flex h-[22px] shrink-0 items-center justify-center gap-1.5 text-xs font-bold text-muted">
            <AlertIcon size={14} />
            Fill every spot on the court to keep scoring
          </p>
        )}

        {/* Scores: tapping a side records a rally won by the team on that side */}
        <div className="flex min-h-20 flex-1 gap-2.5">
          {SIDES.map((side) => {
            const team = teamOn(court, side)
            return (
              <button
                key={side}
                type="button"
                onClick={() => rally(team)}
                // Without a session the tap opens New session instead.
                disabled={session !== null && (pickPending || emptySpot)}
                aria-label={`Point to Team ${colorName(team)}`}
                className="flex flex-1 flex-col items-center justify-center gap-1 rounded-[22px] text-white select-none enabled:active:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
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
            <p className="flex h-10 items-center text-sm text-faint">Tap a team's score to log the first rally</p>
          )}
        </div>
      </div>

      <GamePointDialog
        team={matchPointTeam}
        court={court}
        byId={byId}
        teamColors={config.teamColors}
        totalPoints={config.totalPoints}
        onEnd={finishGame}
        onKeepPlaying={() => setMatchPointTeam(null)}
      />

      <GameWonDialog entry={winnerEntry} onNext={() => setWinnerEntry(null)} />

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

      <Dialog
        open={idle && !!session}
        role="alertdialog"
        badge={<ClockIcon size={26} />}
        title="Welcome back"
        description="It's been over 12 hours since you last played. Start a new session with a new set of players?"
        actions={
          <>
            <DialogButton
              tone="primary"
              onClick={() => {
                setIdle(false)
                setNewSessionOpen(true)
              }}
            >
              New session
            </DialogButton>
            <DialogButton
              onClick={() => {
                setIdle(false)
                dispatch({ type: 'keepSession', at: Date.now() })
              }}
            >
              Keep current session
            </DialogButton>
          </>
        }
      >
        {session && (
          <p className="-mt-1 text-xs text-subtle">
            Current session: {sessionDateLabel(session.startedAt)} · {session.playerIds.length}{' '}
            {session.playerIds.length === 1 ? 'player' : 'players'}
          </p>
        )}
      </Dialog>

      <Dialog
        open={needsPlayers}
        role="alertdialog"
        onDismiss={() => setNeedsPlayers(false)}
        badge={<Rackets className="h-6 w-7" />}
        title="Not enough players"
        description="Doubles needs at least 4 players. Please pick more players for the current session."
        actions={
          <>
            <DialogButton
              tone="primary"
              onClick={() => {
                setNeedsPlayers(false)
                setDoublesAfterPick(true)
                setSessionPlayersOpen(true)
              }}
            >
              <span className="flex items-center justify-center gap-2">
                <UserPlusIcon size={18} />
                Pick players
              </span>
            </DialogButton>
            <DialogButton onClick={() => setNeedsPlayers(false)}>Stay on singles</DialogButton>
          </>
        }
      >
        {session && (
          <div className="flex items-center gap-2.5 rounded-[14px] bg-page px-3 py-2">
            <div className="flex shrink-0" aria-hidden>
              {sortByName(game.players.filter((p) => session.playerIds.includes(p.id)))
                .slice(0, 3)
                .map((p, i) => (
                  <Avatar key={p.id} player={p} size={30} className={`border-2 border-page ${i > 0 ? '-ml-[9px]' : ''}`} />
                ))}
            </div>
            <span className="text-[13px] font-bold text-ink-2">
              {session.playerIds.length} {session.playerIds.length === 1 ? 'player' : 'players'} in this session
            </span>
          </div>
        )}
      </Dialog>

      <ChangePlayerSheet
        target={picker}
        court={court}
        // With a session running, only its players can be picked.
        saved={session ? game.players.filter((p) => session.playerIds.includes(p.id)) : game.players}
        teamColors={config.teamColors}
        onClose={() => setPicker(null)}
        onPick={pickPlayer}
        onCreate={createPlayer}
      />

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
      <GameRulesSheet open={rulesOpen} onClose={() => setRulesOpen(false)} />
      <SessionSheet
        open={sessionOpen}
        onClose={() => setSessionOpen(false)}
        session={session}
        players={game.players}
        // Opens on top of the Session sheet; closing it comes back here.
        onManagePlayers={() => setPlayersOpen(true)}
        onNewSession={() => setNewSessionOpen(true)}
        onEditPlayers={() => setSessionPlayersOpen(true)}
        onGameCounts={() => setCountsOpen(true)}
      />
      <PickPlayersDialog
        open={pickOpen}
        onClose={() => setPickOpen(false)}
        session={session}
        players={game.players}
        mode={config.mode}
        teamColors={config.teamColors}
        leftTeam={court.leftTeam}
        onStart={(lineup) => {
          dispatch({ type: 'startGame', lineup })
          setPickOpen(false)
        }}
      />
      <GameCountsDialog open={countsOpen} onClose={() => setCountsOpen(false)} session={session} players={game.players} />
      <SessionPlayersDialog
        open={sessionPlayersOpen}
        onClose={() => {
          setSessionPlayersOpen(false)
          setDoublesAfterPick(false)
        }}
        session={session}
        players={game.players}
        onCourt={TEAM_IDS.flatMap((t) => court.teams[t].ids).filter((id) => id !== EMPTY_SLOT)}
        mode={config.mode}
        onCreatePlayer={savePlayer}
        onSave={(playerIds) => {
          dispatch({ type: 'setSessionPlayers', playerIds })
          setSessionPlayersOpen(false)
          // Opened from "Not enough players": with enough now, carry on to doubles.
          if (doublesAfterPick && playerIds.length >= MIN_PLAYERS.doubles) switchMode('doubles')
          setDoublesAfterPick(false)
        }}
      />
      <NewSessionDialog
        open={newSessionOpen}
        onClose={() => setNewSessionOpen(false)}
        players={game.players}
        current={session}
        mode={config.mode}
        onCreatePlayer={savePlayer}
        onStart={({ startedAt, mode, playerIds }) => {
          // The session empties the court for the chosen mode; the setting follows it.
          dispatch({ type: 'startSession', id: newId(), startedAt, mode, playerIds })
          setConfig((c) => ({ ...c, mode }))
          setNewSessionOpen(false)
          setSessionOpen(false)
        }}
      />
      <ManagePlayersSheet open={playersOpen} onClose={() => setPlayersOpen(false)} />

    </div>
  )
}

const BAND_ICON_LINK = 'flex size-11 items-center justify-center rounded-control text-white active:bg-white/15'

const TILE_CAPTION = 'truncate text-[10px] leading-none font-bold tracking-[0.2em] opacity-85 max-[389px]:tracking-[0.12em]'

// Court overlay with no session running: play starts with a session.
function NoSessionOverlay({ onStart }: { onStart: () => void }) {
  return (
    <>
      <div className="text-[11px] font-extrabold tracking-[0.22em] text-white/80">NO SESSION</div>
      <button
        type="button"
        onClick={onStart}
        className="flex h-12 items-center gap-2 rounded-[14px] bg-white px-[22px] text-[15px] font-extrabold text-band-ink active:opacity-85"
      >
        <PlusIcon size={18} />
        Start a session
      </button>
    </>
  )
}

// Court overlay before each game of a session: pick its players, or keep last game's.
function PickOverlay({
  gameNumber,
  same,
  onPick,
  onSame,
}: {
  gameNumber: number
  same: Player[] | null
  onPick: () => void
  onSame: () => void
}) {
  return (
    <>
      <div className="text-[11px] font-extrabold tracking-[0.22em] text-white/80">NEXT UP · GAME {gameNumber}</div>
      <button
        type="button"
        onClick={onPick}
        className="flex h-12 items-center gap-2 rounded-[14px] bg-white px-[22px] text-[15px] font-extrabold text-band-ink active:opacity-85"
      >
        <UserPlusIcon size={18} />
        Pick players
      </button>
      {same && (
        <button
          type="button"
          onClick={onSame}
          aria-label={`Same players: ${same.map((p) => p.name).join(', ')}`}
          className="flex h-10 items-center gap-2 rounded-control border-[1.5px] border-white/55 pr-3.5 pl-2 text-[13px] font-bold text-white active:bg-white/10"
        >
          <span className="flex" aria-hidden>
            {same.map((p, i) => (
              <Avatar key={p.id} player={p} size={22} className={`border-2 border-[#3A3F49] ${i > 0 ? '-ml-[9px]' : ''}`} />
            ))}
          </span>
          Same players
        </button>
      )}
    </>
  )
}

// "today", "yesterday", "3 days ago", "12 Nov": the day label, read aloud.
function spokenDay(at: number) {
  const label = dayLabel(at)
  if (label === 'Today' || label === 'Yesterday') return label.toLowerCase()
  return label.replace(/^(\d)d ago$/, '$1 days ago')
}

// Left band tile: when the session started and who's in it, or a prompt to start one. Opens
// the Session sheet either way.
function SessionTile({ session, players, onClick }: { session: Session | null; players: Player[]; onClick: () => void }) {
  if (!session) {
    return (
      <BandTile
        className="flex-1 gap-1.5 pr-2 pl-3"
        onClick={onClick}
        aria-label="No session. Start a session"
        icon={<PlusIcon size={13} />}
        iconClassName="max-[389px]:hidden"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="truncate text-[13px] font-extrabold opacity-85">No session</div>
          <span className="flex h-[22px] items-center self-start rounded-full bg-white px-2.5 text-xs font-extrabold text-band-ink">
            Start
          </span>
        </div>
      </BandTile>
    )
  }
  const inSession = sortByName(players.filter((p) => session.playerIds.includes(p.id)))
  const extra = inSession.length - 3
  const count = `${inSession.length} ${inSession.length === 1 ? 'player' : 'players'}`
  return (
    <BandTile
      className="flex-1 gap-1.5 pr-2 pl-3"
      onClick={onClick}
      aria-label={`Session: ${spokenDay(session.startedAt)} at ${timeLabel(session.startedAt)}, ${count}. Open session`}
      icon={<ChevronRightIcon size={13} />}
      // Below 390px the tile is too narrow for the chevron next to the avatars.
      iconClassName="max-[389px]:hidden"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {/* Day only; the time is in the Session sheet (the tile has no room for both). */}
        <div className="truncate text-[13px] font-extrabold">{dayLabel(session.startedAt)}</div>
        {/* Fixed-size avatars overlapping by half: later ones may cover earlier initials, but
            they never squash. */}
        <div className="flex min-w-0 items-center overflow-hidden" aria-hidden>
          {inSession.slice(0, 3).map((p, i) => (
            <Avatar key={p.id} player={p} size={24} className={`border-2 border-band-tile ${i > 0 ? '-ml-3' : ''}`} />
          ))}
          {extra > 0 && <span className="ml-1.5 shrink-0 text-[13px] font-extrabold whitespace-nowrap">+{extra}</span>}
        </div>
      </div>
    </BandTile>
  )
}

// Rule in words, for the tile's accessible name.
function swapRuleLabel(sideSwitch: SideSwitch) {
  if (sideSwitch.kind === 'off') return 'auto swap sides off'
  if (sideSwitch.kind === 'half') return 'swap sides at half'
  return `swap sides every ${sideSwitch.points} points`
}

// Auto swap sides state on the rules tile: the rule plus an ON/OFF pill.
function AutoSwapStatus({ sideSwitch }: { sideSwitch: SideSwitch }) {
  const on = sideSwitch.kind !== 'off'
  const text = sideSwitch.kind === 'off' ? 'Off' : sideSwitch.kind === 'half' ? 'At half' : `Every ${sideSwitch.points}`
  return (
    <div className="flex h-5 min-w-0 items-center gap-[5px] text-[13px] leading-none font-bold whitespace-nowrap">
      {/* Dropped on narrow screens, where the rule text needs the room. */}
      <SwapIcon size={14} className="shrink-0 max-[389px]:hidden" />
      <span className="truncate">{text}</span>
      <span
        className={`inline-flex h-4 shrink-0 items-center rounded-full px-1.5 text-[9px] leading-none font-extrabold tracking-[0.08em] ${
          on ? 'bg-flip-digit text-ink' : 'bg-white/20 text-white'
        }`}
      >
        {on ? 'ON' : 'OFF'}
      </span>
    </div>
  )
}
