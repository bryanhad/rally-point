import { Link, useNavigate } from '@tanstack/react-router'
import { useState, type ReactNode } from 'react'
import { RallyMark, ShuttleMono } from '../components/ui/brand'
import { ChevronRightIcon, GearIcon, PlayIcon, UserPlusIcon } from '../components/ui/icons'
import { newId } from '../lib/id'
import { useNow } from '../lib/useNow'
import { Avatar } from '../sports/badminton/Avatar'
import { useBadminton } from '../sports/badminton/context'
import { EMPTY_SLOT, hasRallies, otherTeam, screenScore, teamOn } from '../sports/badminton/game'
import { HistorySheet } from '../sports/badminton/HistorySheet'
import { Racket, Rackets } from '../sports/badminton/icons'
import { NewSessionConfirm, NewSessionDialog, type NewSession } from '../sports/badminton/NewSessionDialog'
import { TEAM_COLORS, type Config, type HistoryEntry, type Player, type Session, type StoredSession, type TeamId } from '../sports/badminton/schema'
import { currentSession, dayLabel, nextGameNumber, timeLabel } from '../sports/badminton/session'
import { viewSide } from '../sports/badminton/view'
import { avatarCap, compactDuration, selectHome, sinceTitle, tileAction, type NextGame } from './homeState'

const MODE_NAME = { singles: 'Singles', doubles: 'Doubles' } as const
const SECTION = 'text-[13px] font-extrabold tracking-[0.08em] text-muted'
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
// "Sat 21 Nov".
const shortDate = (t: number) =>
  new Date(t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '')

// Home: the blue band (Singles / Doubles to start), then the first-visit guide, the last session,
// or the ongoing one. Which one comes from the data (selectHome), never from a stored mode.
export function HomePage() {
  const { game, court, config, setConfig, dispatch, history } = useBadminton()
  const navigate = useNavigate()
  const now = useNow()
  const [historyOpen, setHistoryOpen] = useState(false)
  // The New session popup, opened by Singles / Doubles with that format. `replacing`: the
  // running session ends when the new one starts (the user confirmed "Start a new session?").
  const [newSession, setNewSession] = useState<{ mode: Config['mode']; replacing: boolean } | null>(null)
  // "Start a new session?" for the format tapped, while a session is running.
  const [confirmNew, setConfirmNew] = useState<Config['mode'] | null>(null)

  const current = currentSession(game)
  const lineupIds = [...court.teams[court.leftTeam].ids, ...court.teams[otherTeam(court.leftTeam)].ids]
  const home = selectHome({ current, past: game.sessions.past, awaitingPick: game.awaitingPick, lineupIds })
  const byId = new Map(game.players.map((p) => [p.id, p]))

  // No session: a new one starts with its first match (the existing flow, in this format).
  function startSession({ startedAt, mode, playerIds }: NewSession) {
    // Ends the running session like End session (its end time; an unfinished game isn't saved).
    // oxlint-disable-next-line react/purity -- only called from a click handler, not during render
    if (newSession?.replacing) dispatch({ type: 'endSession', at: Date.now() })
    dispatch({ type: 'startSession', id: newId(), startedAt, mode, playerIds })
    setConfig((c) => ({ ...c, mode }))
    setNewSession(null)
    navigate({ to: '/sports/badminton' })
  }

  // Singles / Doubles always start a NEW session; with one running, "Start a new session?" asks
  // first. (The ongoing card's buttons are what continue the current session.)
  function startMatch(mode: Config['mode']) {
    if (tileAction(home) === 'confirm-new-session') setConfirmNew(mode)
    else setNewSession({ mode, replacing: false })
  }

  function savePlayer(name: string) {
    const id = newId()
    dispatch({ type: 'addPlayer', id, name })
    return id
  }

  const line =
    home.kind === 'first-visit'
      ? 'Welcome! Start a match and we keep the score, the serve and the rotation.'
      : home.kind === 'last'
        ? 'No session yet today.'
        : 'Start a new match.'

  return (
    <div className="flex flex-1 flex-col">
      <header className="rounded-b-[28px] bg-band pb-5 text-white" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="mx-auto w-full max-w-[560px]">
          <div className="flex h-14 items-center justify-between pr-2 pl-4">
            <span className="inline-flex items-center gap-2">
              <RallyMark size={28} />
              <span className="text-[15px] font-black tracking-[0.3em]">RALLY POINT</span>
            </span>
            <Link
              to="/sports/badminton/config"
              aria-label="Settings"
              className="flex size-11 items-center justify-center rounded-control active:bg-white/15"
            >
              <GearIcon />
            </Link>
          </div>
          <div className="flex items-baseline gap-2.5 px-5 pt-1.5">
            <h1 className="text-[28px] font-black">Today</h1>
            <span className="text-sm font-semibold text-white/70">{shortDate(now)}</span>
          </div>
          <p className="px-5 pt-1 text-sm text-white/80">{line}</p>
          <div className="flex gap-2.5 px-5 pt-4">
            {(['singles', 'doubles'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => startMatch(mode)}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl bg-white/12 p-3.5 text-left shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22)] active:bg-white/20"
              >
                <span className="relative flex size-[42px] shrink-0 items-center justify-center rounded-xl bg-[#E6EEF7] text-band">
                  {mode === 'singles' ? <Racket strokeWidth={2.2} /> : <Rackets strokeWidth={2.2} />}
                  <span className="absolute -top-[3px] -right-[3px] size-2.5 rounded-full bg-accent shadow-[0_0_0_2px_var(--color-band)]" />
                </span>
                <span className="flex min-w-0 flex-col gap-px">
                  <span className="text-base font-extrabold">{MODE_NAME[mode]}</span>
                  <span className="text-xs text-white/72">{mode === 'singles' ? '1 vs 1' : '2 vs 2'}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[560px] flex-col px-5 pb-4">
        {home.kind === 'first-visit' && <FirstVisit />}

        {home.kind === 'last' && (
          <>
            {/* "All sessions": no sessions list exists yet, so the link is left out. */}
            <SectionTitle>LAST SESSION</SectionTitle>
            <SessionCard
              title={lastSessionTitle(home.session, now)}
              subtitle={`${plural(home.session.games.length, 'game')} · ${plural(sessionPlayerCount(home.session, game.sessionPlayers), 'player')}`}
              // No session detail screen yet: the header opens match history.
              onOpen={() => setHistoryOpen(true)}
              openLabel="Open match history"
              games={sessionResults(home.session, history.entries).slice(0, 3)}
              total={home.session.games.length}
              onSeeAll={() => setHistoryOpen(true)}
            />
          </>
        )}

        {home.kind === 'ongoing' && (
          <>
            <SectionTitle live>ONGOING SESSION</SectionTitle>
            <SessionCard
              title={sinceTitle(home.session.startedAt, now)}
              subtitle={`running ${compactDuration(now - home.session.startedAt)}`}
              avatars={home.session.playerIds.map((id) => byId.get(id)).filter((p): p is Player => !!p)}
              onOpen={() => navigate({ to: '/sports/badminton', search: { open: 'session' } })}
              openLabel="Open the current session"
              current={
                <CurrentGame
                  session={home.session}
                  next={home.next}
                  teams={screenTeams(court, config.view).map((team) => ({
                    team,
                    color: TEAM_COLORS[config.teamColors[team]],
                    score: court.teams[team].score,
                    players: court.teams[team].ids.map((id) => (id === EMPTY_SLOT ? null : (byId.get(id) ?? null))),
                  }))}
                  mode={config.mode}
                  onPick={() => navigate({ to: '/sports/badminton', search: { open: 'pick' } })}
                  onStart={() => {
                    dispatch({ type: 'startGame' })
                    navigate({ to: '/sports/badminton' })
                  }}
                  onResume={() => navigate({ to: '/sports/badminton' })}
                />
              }
              games={sessionResults(home.session, history.entries).slice(0, 2)}
              total={home.session.games.length}
              onSeeAll={() => setHistoryOpen(true)}
            />
          </>
        )}
      </div>

      <HistorySheet open={historyOpen} onClose={() => setHistoryOpen(false)} />

      {/* The popup's form mounts fresh on each opening, so it picks up the format tapped. */}
      {current && (
        <NewSessionConfirm
          open={confirmNew !== null}
          session={current}
          unfinished={
            !game.awaitingPick && hasRallies(game) ? { number: nextGameNumber(current), score: screenScore(court, config.view) } : null
          }
          onConfirm={() => {
            // The format tapped carries through: New session opens in it, without asking again.
            if (confirmNew) setNewSession({ mode: confirmNew, replacing: true })
            setConfirmNew(null)
          }}
          onCancel={() => setConfirmNew(null)}
        />
      )}
      <NewSessionDialog
        open={newSession !== null}
        onClose={() => setNewSession(null)}
        players={game.players}
        // Already confirmed when replacing, so New session doesn't ask again.
        current={newSession?.replacing ? null : current}
        mode={newSession?.mode ?? config.mode}
        onCreatePlayer={savePlayer}
        onStart={startSession}
      />
    </div>
  )
}

function SectionTitle({ children, live = false }: { children: ReactNode; live?: boolean }) {
  return (
    <h2 className={`mt-6 mb-2.5 flex items-center gap-2 ${SECTION}`}>
      {live && <span className="size-2 rounded-full bg-live shadow-[0_0_0_3px_rgba(47,163,107,0.25)]" />}
      {children}
    </h2>
  )
}

// --- First visit ------------------------------------------------------------------------------

const STEPS = [
  ['Add who’s playing', 'Names once, they’re remembered next time'],
  ['Tap the side that wins the rally', 'Score, serve and sides follow the rules'],
  ['We line up the next game', 'Fair rotation for everyone waiting'],
] as const

function FirstVisit() {
  return (
    <>
      <SectionTitle>RECENT MATCHES</SectionTitle>
      <div className="flex flex-col items-center gap-2.5 rounded-[18px] border-[1.5px] border-dashed border-[#D5DAE2] px-5 py-[26px] text-center">
        <span className="flex size-[52px] items-center justify-center rounded-2xl bg-band">
          <RallyMark size={34} />
        </span>
        <span className="text-base font-extrabold">No matches yet</span>
        <span className="text-sm leading-[1.45] text-muted">
          Finished games show up here with the score and who played. Tap Singles or Doubles to start.
        </span>
      </div>
      <SectionTitle>HOW IT WORKS</SectionTitle>
      <ol className="flex flex-col gap-3.5">
        {STEPS.map(([title, detail], i) => (
          <li key={title} className="flex items-start gap-3">
            <span className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-[#E6EEF7] text-[13px] font-black text-band">
              {i + 1}
            </span>
            <span className="flex flex-col gap-px">
              <span className="text-[15px] font-bold">{title}</span>
              <span className="text-[13px] text-muted">{detail}</span>
            </span>
          </li>
        ))}
      </ol>
    </>
  )
}

// --- Session card ------------------------------------------------------------------------------

type Result = { entry: HistoryEntry; number: number | null }

// A session's finished games from match history, newest first, numbered by their place in the
// session (matched on the end time; null when it can't be found).
function sessionResults(session: StoredSession, entries: readonly HistoryEntry[]): Result[] {
  return entries
    .filter((e) => e.sessionId === session.id)
    .map((entry) => {
      const i = session.games.findIndex((g) => Math.abs(g.endedAt - entry.endedAt) < 5_000)
      return { entry, number: i >= 0 ? i + 1 : null }
    })
}

// "Yesterday · 19:00–22:10": from the start to End session (or, for sessions from before End
// session existed, the last game).
function lastSessionTitle(session: StoredSession, now: number) {
  const end = session.endedAt ?? session.games.at(-1)?.endedAt
  return `${dayLabel(session.startedAt, now)} · ${timeLabel(session.startedAt)}${end ? `–${timeLabel(end)}` : ''}`
}

function sessionPlayerCount(session: StoredSession, rows: readonly { sessionId: string }[]) {
  const n = rows.filter((r) => r.sessionId === session.id).length
  // Rows can be missing for very old sessions: count who played instead.
  return n || new Set(session.games.flatMap((g) => g.players.map((p) => p.id))).size
}

function screenTeams(court: Parameters<typeof teamOn>[0], view: Config['view']): TeamId[] {
  const left = teamOn(court, viewSide('left', view))
  return [left, otherTeam(left)]
}

function SessionCard({
  title,
  subtitle,
  avatars,
  onOpen,
  openLabel,
  current,
  games,
  total,
  onSeeAll,
}: {
  title: string
  subtitle: string
  // Ongoing: who's in the session (at most 4 shown, then +N).
  avatars?: Player[]
  onOpen: () => void
  openLabel: string
  current?: ReactNode
  games: Result[]
  total: number
  onSeeAll: () => void
}) {
  const cap = avatars ? avatarCap(avatars) : null
  const rail = [...(current ? [current] : []), ...games.map((g) => <FinishedGame key={g.entry.id} result={g} />)]
  return (
    <section className="rounded-[20px] border border-line bg-white p-3.5 shadow-[0_6px_18px_rgba(20,26,38,0.06)]">
      <button type="button" onClick={onOpen} aria-label={`${title}, ${subtitle}. ${openLabel}`} className="flex w-full items-center gap-3 text-left">
        {/* Above the rail, which starts just under it. */}
        <span className="relative z-[1] flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#E6EEF7]">
          <ShuttleMono size={34} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[15px] font-extrabold">{title}</span>
          <span className="truncate text-[13px] text-muted">{subtitle}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          {cap && (
            <>
              <span className="flex">
                {cap.shown.map((p, i) => (
                  <Avatar key={p.id} player={p} size={24} style={{ boxShadow: '0 0 0 2px #FFFFFF', marginLeft: i ? -7 : 0 }} />
                ))}
              </span>
              {cap.extra > 0 && <span className="text-[13px] font-bold text-muted">+{cap.extra}</span>}
            </>
          )}
          <ChevronRightIcon className="text-subtle" />
        </span>
      </button>

      {rail.length > 0 && (
        <div className="relative mt-3 flex flex-col gap-2 pl-8">
          {rail.map((node, i) => (
            <RailItem key={i} first={i === 0} last={i === rail.length - 1}>
              {node}
            </RailItem>
          ))}
        </div>
      )}
      {total > games.length && (
        <div className="mt-2 flex justify-center">
          <button
            type="button"
            onClick={onSeeAll}
            className="inline-flex h-10 items-center gap-1 rounded-control px-3.5 text-sm font-bold text-band-ink active:bg-soft"
          >
            See all {total} {total === 1 ? 'match' : 'matches'}
            <ChevronRightIcon size={14} />
          </button>
        </div>
      )}
    </section>
  )
}

// One game on the rail: a 2px line down from the session icon (centred under it) with a short
// connector into the tile; the last one curves into its tile and the rail stops there.
function RailItem({ first, last, children }: { first: boolean; last: boolean; children: ReactNode }) {
  const top = first ? -12 : -8
  return (
    <div className="relative">
      {last ? (
        <span
          aria-hidden
          className="absolute -left-[11px] box-border w-[9px] rounded-bl-[10px] border-b-2 border-l-2 border-[#D5DCE6]"
          style={{ top, height: 23 - top }}
        />
      ) : (
        <>
          <span aria-hidden className="absolute bottom-0 -left-[11px] w-0.5 bg-[#D5DCE6]" style={{ top }} />
          <span aria-hidden className="absolute top-[22px] -left-[11px] h-0.5 w-[11px] rounded-r-[2px] bg-[#D5DCE6]" />
        </>
      )}
      {children}
    </div>
  )
}

const CHIP = 'inline-flex h-[22px] items-center rounded-full px-[9px] text-xs font-extrabold'

// The ongoing session's next (or current) game: its number and format, both teams' avatars,
// and one button saying what's next. No names or team colours on the avatars.
function CurrentGame({
  session,
  next,
  teams,
  mode,
  onPick,
  onStart,
  onResume,
}: {
  session: Session
  next: NextGame
  teams: { team: TeamId; color: string; score: number; players: (Player | null)[] }[]
  mode: Config['mode']
  onPick: () => void
  onStart: () => void
  onResume: () => void
}) {
  const number = nextGameNumber(session)
  const button = (label: string, icon: ReactNode, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[46px] min-w-0 flex-1 items-center justify-center gap-2 rounded-[14px] bg-band text-base font-extrabold text-white shadow-[0_6px_14px_rgba(34,104,166,0.28)] active:opacity-85"
    >
      <span className="flex text-accent">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  )
  const side = (players: (Player | null)[], align: 'end' | 'start') => (
    <span className={`flex flex-1 ${align === 'end' ? 'justify-end' : ''}`}>
      <span className="inline-flex">
        {players.map((p, i) => (
          <span key={i} className="relative inline-flex" style={{ marginLeft: i ? -8 : 0, zIndex: 3 - i }}>
            {p ? (
              <Avatar player={p} size={38} style={{ boxShadow: '0 0 0 2px #FFFFFF' }} />
            ) : (
              // An empty slot: a quiet marker.
              <span aria-label="Empty slot" className="flex size-[38px] items-center justify-center rounded-full bg-[#F1F3F6] shadow-[0_0_0_2px_#FFFFFF]">
                <span className="size-3 rounded-full shadow-[inset_0_0_0_2px_#C5CDDA]" />
              </span>
            )}
          </span>
        ))}
      </span>
    </span>
  )
  return (
    <div className="rounded-2xl bg-white px-3.5 py-3 shadow-[inset_0_0_0_1.5px_#CFDDF0,0_4px_12px_rgba(34,104,166,0.08)]">
      <div className="flex items-center gap-2">
        <span className={`${CHIP} bg-band text-white`}>Game {number}</span>
        <span className="text-xs font-semibold text-subtle">{MODE_NAME[mode]}</span>
        {next.kind === 'in-progress' && (
          <span className="ml-auto inline-flex items-center gap-1.5" aria-label={`Score ${teams[0].score}–${teams[1].score}`}>
            {teams.map((t, i) => (
              <span key={t.team} className="contents">
                {i > 0 && <span className="font-extrabold text-disabled">–</span>}
                <span
                  className="inline-flex h-[26px] min-w-[30px] items-center justify-center rounded-lg px-2 text-[15px] font-black text-white tabular-nums"
                  style={{ backgroundColor: t.color }}
                >
                  {t.score}
                </span>
              </span>
            ))}
          </span>
        )}
      </div>
      <div className="mt-3.5 flex items-center justify-center gap-3.5">
        {side(teams[0].players, 'end')}
        <span className="flex size-[34px] items-center justify-center rounded-full bg-page text-xs font-extrabold text-muted">vs</span>
        {side(teams[1].players, 'start')}
      </div>
      <div className="mt-3.5 flex gap-2">
        {next.kind === 'in-progress' && button('Resume game', <PlayIcon />, onResume)}
        {next.kind === 'ready' && (
          <>
            {button(`Start game ${number}`, <PlayIcon />, onStart)}
            <button type="button" onClick={onPick} className="h-[46px] shrink-0 rounded-[14px] bg-page px-3.5 text-sm font-bold text-ink active:bg-soft">
              Change
            </button>
          </>
        )}
        {next.kind === 'pick' &&
          button(
            next.missing === next.total ? 'Pick players' : `Pick ${next.missing} more ${next.missing === 1 ? 'player' : 'players'}`,
            <UserPlusIcon size={18} />,
            onPick,
          )}
      </div>
    </div>
  )
}

// A finished game: its number, format and end time, then both teams (avatars, names, score).
function FinishedGame({ result: { entry, number } }: { result: Result }) {
  const mode = entry.left.players.length === 2 ? 'Doubles' : 'Singles'
  const fallback = [TEAM_COLORS.red, TEAM_COLORS.blue]
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-page px-3.5 py-3">
      <span className="flex items-center gap-2">
        {number !== null && <span className={`${CHIP} bg-white text-ink shadow-[inset_0_0_0_1px_var(--color-line)]`}>Game {number}</span>}
        <span className="text-xs font-semibold text-subtle">
          {mode} · {timeLabel(entry.endedAt)}
          {entry.winner === 'draw' && ' · Draw'}
        </span>
      </span>
      {(['left', 'right'] as const).map((key, i) => (
        <TeamRow key={key} side={entry[key]} won={entry.winner === key} color={entry[key].color ?? fallback[i]} />
      ))}
    </div>
  )
}

// Avatars, the names joined with " / ", then the score. Each name truncates on its own, so both
// partners always show; names of 6 characters or fewer never shrink, nor do avatars or the score.
function TeamRow({ side, won, color }: { side: HistoryEntry['left']; won: boolean; color: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="inline-flex shrink-0">
        {side.players.map((p, i) => (
          <Avatar key={p.id} player={p} size={26} style={{ boxShadow: '0 0 0 2px var(--color-page)', marginLeft: i ? -8 : 0 }} />
        ))}
      </span>
      <span className={`flex min-w-0 flex-1 text-[15px] ${won ? 'font-extrabold text-ink' : 'font-semibold text-muted'}`}>
        {side.players.map((p, i) => (
          <span key={p.id} className="contents">
            {i > 0 && <span className="shrink-0 px-1 font-semibold text-disabled">/</span>}
            <span className={`min-w-0 truncate ${p.name.length <= 6 ? 'shrink-0' : 'shrink'}`}>{p.name}</span>
          </span>
        ))}
      </span>
      {won ? (
        <span
          className="inline-flex h-[26px] min-w-[34px] shrink-0 items-center justify-center rounded-lg px-2 text-[15px] font-black text-white tabular-nums"
          style={{ backgroundColor: color }}
        >
          {side.score}
        </span>
      ) : (
        <span className="min-w-[34px] shrink-0 text-center text-[15px] font-bold text-subtle tabular-nums">{side.score}</span>
      )}
    </span>
  )
}
