import { useNow } from '../../lib/useNow'
import { BottomSheet } from '../../components/ui/BottomSheet'
import { CalendarIcon, FlagIcon, PlusIcon, UserPlusIcon, UsersIcon } from '../../components/ui/icons'
import { Racket, Rackets } from './icons'
import { sessionOrder } from './queue'
import type { Config, Player, Session, TeamId } from './schema'
import { dayLabel, nextGameNumber, runningLabel, timeLabel } from './session'
import { SessionPlayersList } from './SessionPlayersList'

type SessionSheetProps = {
  open: boolean
  onClose: () => void
  session: Session | null
  // Saved players (current names and colours).
  players: readonly Player[]
  // The current mode (it can change mid-session).
  mode: Config['mode']
  teamColors: Config['teamColors']
  // The lineup of the game in progress; null between games (no ON COURT section then).
  onCourt: Record<TeamId, readonly string[]> | null
  onManagePlayers: () => void
  onEditPlayers: () => void
  // Without a session: the prompt's New session.
  onNewSession: () => void
  // End session (asks first). A new session starts from home with its first match.
  onEndSession: () => void
}

// The running session: a blue summary card (in progress, when it started, mode, games / players
// / running time), then every session player in one list (waiting, just played, on court, left)
// with their games, and Manage players / End session at the bottom. Without a session, a prompt
// to start one.
export function SessionSheet({
  open,
  onClose,
  session,
  players,
  mode,
  teamColors,
  onCourt,
  onManagePlayers,
  onEditPlayers,
  onNewSession,
  onEndSession,
}: SessionSheetProps) {
  const now = useNow(open && !!session)
  const rows = session ? sessionOrder(session, players, 'session', { onCourt }) : []

  const manage = (
    <button
      type="button"
      onClick={onManagePlayers}
      className="flex h-[50px] flex-1 items-center justify-center gap-2 rounded-[14px] bg-soft text-sm font-bold text-ink active:opacity-75"
    >
      <UsersIcon size={16} />
      Manage players
    </button>
  )

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Current Session"
      tall={!!session}
      subheaderBorder={false}
      subheader={session && <Summary session={session} mode={mode} now={now} onEditPlayers={onEditPlayers} />}
      footer={
        <div className="flex gap-2.5 border-t border-soft px-4 pt-3 pb-5">
          {manage}
          {/* Outlined red, not solid: the solid red is the confirmation's. */}
          {session && (
            <button
              type="button"
              onClick={onEndSession}
              className="flex h-[50px] flex-1 items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-[#F3C4BF] bg-white text-sm font-extrabold text-danger active:bg-danger-soft"
            >
              <FlagIcon size={18} />
              End session
            </button>
          )}
        </div>
      }
    >
      {session ? (
        <SessionPlayersList
          entries={rows}
          players={players}
          query=""
          teamColors={teamColors}
          groupTitles={{ waiting: 'WAITING · UP NEXT', 'on-court': `ON COURT · GAME ${nextGameNumber(session)}` }}
        />
      ) : (
        <div className="flex min-h-full flex-col items-center justify-center gap-3 px-7 pb-10 text-center">
          <span className="flex size-16 items-center justify-center rounded-[20px] bg-accent-soft text-band-ink">
            <CalendarIcon />
          </span>
          <div className="text-lg font-extrabold">No session yet</div>
          <p className="text-sm leading-[1.45] text-muted">
            Start a session to pick who&apos;s playing today and keep count of everyone&apos;s games.
          </p>
          <button
            type="button"
            onClick={onNewSession}
            className="mt-2.5 flex h-[50px] items-center justify-center gap-2 self-stretch rounded-[14px] bg-band text-[15px] font-extrabold text-white active:opacity-80"
          >
            <PlusIcon size={18} />
            New session
          </button>
        </div>
      )}
    </BottomSheet>
  )
}

function Summary({
  session,
  mode,
  now,
  onEditPlayers,
}: {
  session: Session
  mode: Config['mode']
  now: number
  onEditPlayers: () => void
}) {
  const stats = [
    { value: String(session.games.length), label: session.games.length === 1 ? 'game' : 'games' },
    // Active players: those who left have no row any more.
    { value: String(session.members.length), label: session.members.length === 1 ? 'player' : 'players' },
    { value: runningLabel(now - session.startedAt), label: 'running' },
  ]
  return (
    <>
      <div className="mx-4 mt-2.5 flex flex-col gap-3.5 rounded-[18px] bg-[#2268A6] px-4 pt-3.5 pb-4 text-white">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-[3px]">
            <div className="flex items-center gap-[7px] text-[11px] font-extrabold tracking-[0.16em] text-white/80">
              <span className="size-2 rounded-full bg-[#6EE7A0] shadow-[0_0_0_3px_rgba(110,231,160,0.25)]" />
              IN PROGRESS
            </div>
            <div className="truncate text-lg font-extrabold">
              {dayLabel(session.startedAt, now)} · started {timeLabel(session.startedAt)}
            </div>
          </div>
          <span className="flex h-[30px] shrink-0 items-center gap-1.5 rounded-full bg-white/16 px-2.5 text-[13px] font-extrabold">
            {mode === 'singles' ? <Racket className="h-4 w-3" /> : <Rackets className="h-4 w-[18px]" />}
            {mode === 'singles' ? 'Singles' : 'Doubles'}
          </span>
        </div>
        <div className="flex gap-3.5">
          {stats.map((s, i) => (
            <div key={s.label} className="contents">
              {i > 0 && <span aria-hidden className="w-px self-stretch bg-white/22" />}
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="text-[22px] leading-[1.1] font-extrabold tabular-nums">{s.value}</span>
                <span className="text-xs font-bold text-white/75">{s.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-end justify-between px-5 pt-[18px] pb-1">
        <h3 className="text-[17px] font-extrabold">Session players</h3>
        <button
          type="button"
          onClick={onEditPlayers}
          aria-label="Edit session players"
          className="flex h-9 items-center gap-1.5 rounded-[10px] bg-soft px-3 text-[13px] font-extrabold text-band-ink active:opacity-75"
        >
          <UserPlusIcon />
          Edit
        </button>
      </div>
    </>
  )
}
