import { useEffect, useRef, useState } from 'react'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { dismissNotice, notify, type NoticeInput } from '../../lib/notice'
import { newId } from '../../lib/id'
import { ConfirmDialog, Dialog, DialogButton } from '../../components/ui/Dialog'
import { ClockIcon, FlagIcon, ResetIcon, UserPlusIcon } from '../../components/ui/icons'
import { Avatar } from './Avatar'
import { useBadminton } from './context'
import {
  allPlayers,
  canRedo,
  createHistoryEntry,
  EMPTY_SLOT,
  hasEmptySlot,
  hasRallies,
  otherTeam,
  replay,
  screenScore,
  shouldSwitchSides,
  sortByName,
  TEAM_IDS,
  type RallyStep,
} from './game'
import { ChangePlayerSheet, type PickerTarget } from './ChangePlayerSheet'
import { CourtPreviewDialog } from './CourtPreviewDialog'
import { GameWonDialog, TargetReachedDialog } from './GameEndDialogs'
import { useScoreToast } from './useScoreToast'
import { afterRally, gamePointTeam, inDeuce, isDeuceTie } from './rules'
import { MOTION, useViewFlip } from './motion'
import { SWAP_AFTER_POINT, SWAP_FIRST_MOVE, swapSidesDuration, type CourtMotion } from './useCourtMotion'
import { usePrefersReducedMotion } from '../../components/ui/overlay'
import { GameRulesSheet } from './GameRulesSheet'
import { HistorySheet } from './HistorySheet'
import { ManagePlayersSheet } from './ManagePlayersSheet'
import { RallySheet } from './RallySheet'
import { currentSession, isIdle, nextGameNumber, sessionDateLabel } from './session'
import { PickPlayersDialog } from './PickPlayersDialog'
import { MIN_PLAYERS } from './playerList'
import { SessionSheet } from './SessionSheet'
import { NewSessionDialog } from './NewSessionDialog'
import { SessionPlayersDialog } from './SessionPlayersDialog'
import { Racket, Rackets } from './icons'
import { type Config, type HistoryEntry, type Player, type TeamId } from './schema'
import { colorName, type ScoreboardView } from './scoreboardView'
import { changeEndsNotice, historyNotice, joinedNotice } from './notices'
import { ScoreboardPhone } from './ScoreboardPhone'
import { ScoreboardTablet } from './ScoreboardTablet'

const routeApi = getRouteApi('/sports/badminton/')

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

// The scoreboard page: owns the game handlers and every sheet/dialog, and renders the phone or
// tablet layout with them.
export function Scoreboard() {
  const { game, court, steps, dispatch, config, setConfig, addHistoryEntry, history } = useBadminton()

  // The team whose scoring tap just won the game (the end-of-game confirmation is open).
  // Tracked by team because an automatic change of ends on the same point may move
  // them to the other side of the screen.
  const [reachedTeam, setReachedTeam] = useState<TeamId | null>(null)
  const scoreToast = useScoreToast()
  // A notification held back while the GAME POINT / DEUCE toast shows (Change ends on the same
  // point): it follows once that toast has gone. The two never show together: when that toast
  // appears, the notification leaves early.
  const pendingNotice = useRef<NoticeInput | null>(null)
  function flushPendingNotice() {
    if (pendingNotice.current) notify(pendingNotice.current)
    pendingNotice.current = null
  }
  const hadScoreToast = useRef(false)
  useEffect(() => {
    const showing = !!scoreToast.toast
    if (showing && !hadScoreToast.current) dismissNotice()
    if (!showing && hadScoreToast.current) flushPendingNotice()
    hadScoreToast.current = showing
  }, [scoreToast.toast])
  // The last forward action on the court (a point, a swap, a change), so the court can play its
  // motion, and Undo of a move that moved players (played back faster). Redo and Reset never set
  // it, so they only show the end state.
  const [courtMotion, setCourtMotion] = useState<CourtMotion | null>(null)
  const reducedMotion = usePrefersReducedMotion()
  // How the score buttons slide when they change sides with this action (0: jump).
  const [buttonSlide, setButtonSlide] = useState<{ duration: number; delay: number }>({ duration: MOTION.slide, delay: 0 })
  type MotionKind = CourtMotion extends infer M ? (M extends { kind: string } ? Omit<M, 'id'> : never) : never
  // Tags the action about to be dispatched, in the same click (so in the same render).
  function move(next: MotionKind | null, slide: { duration: number; delay?: number } = { duration: 0 }) {
    if (next) setCourtMotion((m) => ({ ...next, id: (m?.id ?? 0) + 1 }) as CourtMotion)
    setButtonSlide({ duration: slide.duration, delay: slide.delay ?? 0 })
  }
  // Referee view / Facing referee: a view setting only (config, this device). Only the court card
  // draws `courtView`, which switches when the flipping card is edge-on; everything else
  // (score buttons, score text) follows config.view at once.
  const { shown: courtView, phase: flipPhase } = useViewFlip(config.view)
  const [winnerEntry, setWinnerEntry] = useState<HistoryEntry | null>(null)
  const [pendingMode, setPendingMode] = useState<Config['mode'] | null>(null)
  const [picker, setPicker] = useState<PickerTarget | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  // Which rally the detail sheet shows; kept while the sheet animates closed.
  const [rallyNumber, setRallyNumber] = useState<number | null>(null)
  const [rallyOpen, setRallyOpen] = useState(false)
  const [confirm, setConfirm] = useState<'end' | 'reset' | 'end-session' | null>(null)
  const navigate = useNavigate()
  const [rulesOpen, setRulesOpen] = useState(false)
  // Tablet: the Court preview card.
  const [courtOpen, setCourtOpen] = useState(false)
  const [playersOpen, setPlayersOpen] = useState(false)
  const [sessionOpen, setSessionOpen] = useState(false)
  const [newSessionOpen, setNewSessionOpen] = useState(false)
  const [sessionPlayersOpen, setSessionPlayersOpen] = useState(false)
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

  const players = allPlayers(game)
  const byId = new Map(players.map((p) => [p.id, p]))
  const started = hasRallies(game)
  const session = currentSession(game)
  // The session's last finished game (match history is newest first); gone after Clear history.
  const lastResult = (session && history.entries.find((e) => e.sessionId === session.id)) || null
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
  const scores = { a: court.teams.a.score, b: court.teams.b.score }

  function rally(team: TeamId) {
    // Play happens inside a session: without one, a score tap starts one.
    if (!session) return setNewSessionOpen(true)
    // The game ignores the tap while picking or with an empty spot, so nothing may fire then.
    if (pickPending || emptySpot) return
    const score = court.teams[team].score + 1
    const rules = { totalPoints: config.totalPoints, sideSwitch: config.sideSwitch }
    // The only place a forward score happens, so the confirmation and the game point / deuce
    // toasts fire from here and never on Undo/Redo/Reset/reload (and click handlers don't
    // double-run under StrictMode). The indicators come from the score instead (gpTeam, inDeuce
    // below). A tie shows DEUCE, a lead GAME POINT; each replaces the other.
    const outcome = afterRally(scores, team, config.totalPoints)
    if (outcome === 'won') setReachedTeam(team)
    const otherScore = court.teams[otherTeam(team)].score
    const swap = shouldSwitchSides(score, otherScore, rules)
    // The point feedback plays first (then the automatic swap, if any); the toast follows.
    const after = reducedMotion ? 0 : swap ? SWAP_AFTER_POINT + swapSidesDuration() : MOTION.point
    if (outcome === 'game-point') scoreToast.show({ kind: 'game-point', team }, after)
    else if (outcome === 'deuce') scoreToast.show({ kind: 'deuce' }, after)
    else scoreToast.dismiss()
    // On a swap, the score buttons slide with the first player.
    move({ kind: 'point', team, swap }, { duration: MOTION.swapEach, delay: SWAP_AFTER_POINT + SWAP_FIRST_MOVE })
    // A Change ends still waiting for a GAME POINT / DEUCE toast is still news: show it now.
    flushPendingNotice()
    if (swap) {
      // The court after this point: the score, and the teams on their new ends.
      const next = { ...court, teams: { ...court.teams, [team]: { ...court.teams[team], score } }, leftTeam: otherTeam(court.leftTeam) }
      const notice = changeEndsNotice(score, next, config.view, config.teamColors)
      // Never alongside the GAME POINT / DEUCE toast: Change ends follows once it has left.
      if (outcome === 'game-point' || outcome === 'deuce') pendingNotice.current = notice
      else notify(notice)
    }
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
    // Undo plays back a move that moved players, faster.
    const swapEnds = last.event.type === 'swapEnds' || (last.event.type === 'rally' && last.event.swapEnds)
    move({ kind: 'undo', swapEnds }, { duration: MOTION.slideBack })
    dispatch({ type: 'undo' })
    pendingNotice.current = null
    scoreToast.clear()
    notify(historyNotice('undo', last, { name: nameOf, view: config.view, colors: config.teamColors }))
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
      move({ kind: 'swap-positions' })
      dispatch({ type: 'swapPartners', team: picker.team, at: Date.now() })
    } else {
      move({ kind: 'change-player' })
      dispatch({ type: 'assignPlayer', ...picker, playerId, at: Date.now() })
    }
    setPicker(null)
  }

  // A player joins the running session, arriving now (after the games played so far).
  // Adds a player to the running session, arrived after `joinedAfterGame` finished games
  // (default: just now).
  function joinSession(id: string, joinedAfterGame = session?.games.length ?? 0) {
    if (session && !session.playerIds.includes(id)) dispatch({ type: 'joinSession', playerId: id, joinedAfterGame })
  }

  // "nadia joined the session": for a player added without going on court (nothing on screen
  // shows them otherwise). Not when they go straight into a slot.
  function announceJoin(names: string[], joinedAfterGame = session?.games.length ?? 0) {
    if (!session || names.length === 0) return
    notify(joinedNotice(names, session.games.length - joinedAfterGame, session.members.length + names.length))
  }

  // Saves a new player and returns their id.
  function savePlayer(name: string) {
    const id = newId()
    dispatch({ type: 'addPlayer', id, name })
    return id
  }

  // New player from the Change player sheet: always saved, and joins the running session;
  // "Add & replace" also puts them in the slot and closes the sheet, "Just add" leaves it open.
  function createPlayer(name: string, replace: boolean, joinedAfterGame?: number) {
    const id = savePlayer(name)
    joinSession(id, joinedAfterGame)
    if (!replace) announceJoin([name], joinedAfterGame)
    if (replace && picker) {
      move({ kind: 'change-player' })
      dispatch({ type: 'assignPlayer', ...picker, playerId: id, at: Date.now() })
      setPicker(null)
    }
  }

  function redo() {
    if (!canRedo(game)) return
    // Replay the saved copy to describe the entry that is about to come back.
    const next = replay({ ...game, log: game.redoLog! }).steps[game.log.length]
    // Redo just shows the end state.
    move(null)
    dispatch({ type: 'redo' })
    pendingNotice.current = null
    scoreToast.clear()
    notify(historyNotice('redo', next, { name: nameOf, view: config.view, colors: config.teamColors }))
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
    setReachedTeam(null)
    setConfirm(null)
    setWinnerEntry(entry)
  }

  const { a, b } = court.teams
  // On game point right now, worked out from the score on every render.
  const gpTeam = blocked ? null : gamePointTeam(scores, config.totalPoints)
  // Deuce reached and the game still open: the ring stays through every game point inside it.
  const deuce = !blocked && inDeuce(scores, config.totalPoints)
  // A toast only while it's still true: its team on game point, or the score still tied in
  // deuce (Undo or Reset end it at once).
  const current = scoreToast.toast
  const shownToast =
    current &&
    !blocked &&
    (current.kind === 'game-point' ? current.team === gpTeam : isDeuceTie(scores, config.totalPoints))
      ? current
      : null
  const reachedTotal = Math.max(a.score, b.score) >= config.totalPoints
  const leader: TeamId | 'draw' = a.score === b.score ? 'draw' : a.score > b.score ? 'a' : 'b'
  const teamNames = (team: TeamId) =>
    court.teams[team].ids.map((id) => byId.get(id)?.name ?? '?').join(' & ')
  const scoreText = screenScore(court, config.view)

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

  // One-shot requests from home (?open=pick&mode=…, ?open=session): act once, then clear them
  // from the URL so Back or a reload doesn't repeat them.
  const search = routeApi.useSearch()
  useEffect(() => {
    if (!search.open) return
    if (search.open === 'session') setSessionOpen(true)
    if (search.open === 'pick' && session && pickPending) {
      const mode = search.mode ?? config.mode
      // Doubles needs enough session players first: that prompt opens instead of the picker.
      if (mode === 'doubles' && session.playerIds.length < MIN_PLAYERS.doubles) requestMode(mode)
      else {
        if (mode !== config.mode) applyMode(mode)
        setPickOpen(true)
      }
    }
    navigate({ to: '/sports/badminton', search: {}, replace: true })
    // Runs for a new request only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.open, search.mode])

  // Rallies only, numbered in play order, newest first for the strip.
  const chronological = steps
    .filter((s): s is RallyStep => s.event.type === 'rally')
    .map((step, i) => ({ step, number: i + 1 }))
  const rallies = [...chronological].reverse()

  const view: ScoreboardView = {
    court,
    byId,
    config,
    view: config.view,
    courtView,
    courtMotion,
    flip: flipPhase,
    onFlipView: () => {
      move(null, { duration: MOTION.slide })
      setConfig((c) => ({ ...c, view: c.view === 'facing' ? 'referee' : 'facing' }))
    },
    buttonSlide,
    session,
    players: game.players,
    started,
    pickPending,
    blocked,
    emptySpot,
    reachedTotal,
    gamePoint: gpTeam,
    deuce,
    toast: shownToast,
    courtOpen,
    canUndo: !blocked && game.log.length > 0,
    canRedo: !blocked && canRedo(game),
    sameLineup,
    gameNumber: session ? nextGameNumber(session) : null,
    lastResult: session && lastResult ? { gameNumber: session.games.length, entry: lastResult } : null,
    rallies,
    onRally: rally,
    onUndo: undo,
    onRedo: redo,
    onReset: () => setConfirm('reset'),
    onEnd: () => setConfirm('end'),
    onMode: requestMode,
    onSides: () => {
      // The score buttons slide with the first player.
      move({ kind: 'swap-sides' }, { duration: MOTION.swapEach, delay: SWAP_FIRST_MOVE })
      dispatch({ type: 'swapEnds', at: Date.now() })
    },
    onServer: () => {
      move({ kind: 'change-server' })
      dispatch({ type: 'switchServer' })
    },
    onPick: (team, slot) => setPicker({ team, slot }),
    // Only before the first rally; Court hides it for singles.
    onSwapPartners: started
      ? undefined
      : (team) => {
          move({ kind: 'swap-positions' })
          dispatch({ type: 'swapPartners', team, at: Date.now() })
        },
    onOpenSession: () => setSessionOpen(true),
    onOpenRules: () => setRulesOpen(true),
    onOpenCourt: () => setCourtOpen(true),
    onOpenRally: (number) => {
      setRallyNumber(number)
      setRallyOpen(true)
    },
    onOpenHistory: () => setHistoryOpen(true),
    onNewSession: () => setNewSessionOpen(true),
    onPickPlayers: () => setPickOpen(true),
    onSamePlayers: () => dispatch({ type: 'startGame' }),
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Both layouts are rendered and CSS shows the one for this screen (see the tablet
          variants in theme.css). The state and every sheet/dialog below live here, outside
          both, so rotating a tablet keeps open sheets and everything else as it was. */}
      <ScoreboardPhone v={view} className="flex tablet:hidden" />
      <ScoreboardTablet v={view} className="hidden tablet:flex" />

      <CourtPreviewDialog open={courtOpen} onClose={() => setCourtOpen(false)} v={view} />

      {/* The game point announcement for screen readers: one region, set by the toast. */}
      <div role="status" aria-live="assertive" className="sr-only">
        {!shownToast || shownToast.leaving
          ? ''
          : shownToast.kind === 'deuce'
            ? 'Deuce. Next two in a row wins'
            : `Game point, Team ${colorName(config, shownToast.team)}`}
      </div>

      <TargetReachedDialog
        team={reachedTeam}
        court={court}
        byId={byId}
        teamColors={config.teamColors}
        onEnd={finishGame}
        onKeepPlaying={() => setReachedTeam(null)}
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
        session={session}
        players={game.players}
        teamColors={config.teamColors}
        onClose={() => setPicker(null)}
        onPick={pickPlayer}
        onCreate={createPlayer}
        onAddToSession={joinSession}
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

      {/* End session: the session goes to the past (home shows it under LAST SESSION); the next
          match from home starts a new one. A game in progress isn't saved. */}
      <ConfirmDialog
        open={confirm === 'end-session'}
        icon={<FlagIcon size={26} />}
        title="End today’s session?"
        description={
          <>
            The <strong className="text-ink">{plural(session?.games.length ?? 0, 'game')}</strong> and{' '}
            <strong className="text-ink">{plural(session?.members.length ?? 0, 'player')}</strong> are saved to history. Your
            next match starts a new session.
            {session && !pickPending && hasRallies(game) && (
              <>
                {' '}
                Game {nextGameNumber(session)} ({scoreText}) isn&apos;t finished and won&apos;t be saved.
              </>
            )}
          </>
        }
        confirmLabel="End session"
        confirmTone="danger"
        cancelLabel="Keep playing"
        onConfirm={() => {
          // oxlint-disable-next-line react/purity -- only called from a click handler, not during render
          dispatch({ type: 'endSession', at: Date.now() })
          scoreToast.clear()
          setConfirm(null)
          setSessionOpen(false)
          navigate({ to: '/' })
        }}
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
          move(null)
          dispatch({ type: 'restart' })
          scoreToast.clear()
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
        view={config.view}
        colors={config.teamColors}
      />

      <HistorySheet open={historyOpen} onClose={() => setHistoryOpen(false)} />
      <GameRulesSheet open={rulesOpen} onClose={() => setRulesOpen(false)} />
      <SessionSheet
        open={sessionOpen}
        onClose={() => setSessionOpen(false)}
        session={session}
        players={game.players}
        mode={config.mode}
        teamColors={config.teamColors}
        // Between games nobody is on court (last game's players are JUST PLAYED).
        onCourt={pickPending ? null : { a: court.teams.a.ids, b: court.teams.b.ids }}
        // Open on top of the Session sheet; closing them comes back here.
        onManagePlayers={() => setPlayersOpen(true)}
        onNewSession={() => setNewSessionOpen(true)}
        onEditPlayers={() => setSessionPlayersOpen(true)}
        onEndSession={() => setConfirm('end-session')}
      />
      <PickPlayersDialog
        open={pickOpen}
        onClose={() => setPickOpen(false)}
        session={session}
        players={game.players}
        lastResult={lastResult}
        onCreatePlayer={(name, arrived, intoSlot) => {
          const id = savePlayer(name)
          joinSession(id, arrived)
          if (!intoSlot) announceJoin([name], arrived)
          return id
        }}
        onAddToSession={joinSession}
        mode={config.mode}
        teamColors={config.teamColors}
        court={court}
        view={config.view}
        onFlipView={view.onFlipView}
        onStart={(lineup) => {
          dispatch({ type: 'startGame', lineup })
          setPickOpen(false)
        }}
      />
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
          const added = session ? playerIds.filter((id) => !session.playerIds.includes(id)) : []
          dispatch({ type: 'setSessionPlayers', playerIds })
          // Newcomers arrive now; the count is the session's after saving.
          if (session && added.length > 0) notify(joinedNotice(added.map(nameOf), 0, playerIds.length))
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
        unfinished={session && !pickPending && started ? { number: nextGameNumber(session), score: scoreText } : null}
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
