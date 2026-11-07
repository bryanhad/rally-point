import { BottomSheet } from '../../components/ui/BottomSheet'
import { BarsIcon, CalendarIcon, ChevronRightIcon, PlusIcon, UserPlusIcon, UsersIcon } from '../../components/ui/icons'
import { Avatar } from './Avatar'
import { sortByName } from './game'
import type { Player, Session } from './schema'
import { sessionDateLabel } from './session'

type SessionSheetProps = {
  open: boolean
  onClose: () => void
  session: Session | null
  // Saved players, to show who's in the session.
  players: readonly Player[]
  onManagePlayers: () => void
  // Optional until their screens exist.
  onEditPlayers?: () => void
  onGameCounts?: () => void
  onNewSession?: () => void
}

const CARD = 'rounded-[18px] bg-page'
const CAPTION = 'text-[11px] font-extrabold tracking-[0.2em] text-muted'

// "Saturday, 7 November 2026".
function fullDate(at: number) {
  const d = new Date(at)
  const part = (o: Intl.DateTimeFormatOptions) => d.toLocaleDateString('en-GB', o)
  return `${part({ weekday: 'long' })}, ${part({ day: 'numeric' })} ${part({ month: 'long' })} ${part({ year: 'numeric' })}`
}

// The running session (when it started, who's in it, game counts) or, without one, a prompt to
// start one. Manage players (the saved roster) lives in the header either way.
export function SessionSheet({
  open,
  onClose,
  session,
  players,
  onManagePlayers,
  onEditPlayers,
  onGameCounts,
  onNewSession,
}: SessionSheetProps) {
  const inSession = session ? sortByName(players.filter((p) => session.playerIds.includes(p.id))) : []
  const games = session?.games.length ?? 0

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      eyebrow="BADMINTON"
      title="Session"
      actions={
        <button
          type="button"
          onClick={onManagePlayers}
          className="flex h-11 items-center gap-1.5 rounded-control bg-soft px-3 text-[13px] font-bold text-ink active:opacity-75"
        >
          <UsersIcon />
          Manage players
        </button>
      }
      footer={
        session && (
          <div className="border-t border-soft px-4 pt-3 pb-5">
            <button
              type="button"
              onClick={onNewSession}
              className="flex h-[50px] w-full items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-line-strong bg-white text-[15px] font-extrabold text-ink active:bg-soft"
            >
              <PlusIcon size={18} />
              New session
            </button>
          </div>
        )
      }
    >
      {session ? (
        <div className="flex flex-col gap-2.5 px-4 pt-[18px] pb-4">
          <div className={`${CARD} flex flex-col gap-1 px-4 py-3.5`}>
            <div className={CAPTION}>STARTED</div>
            <div className="text-xl font-extrabold">{sessionDateLabel(session.startedAt)}</div>
            <div className="text-[13px] text-muted">{fullDate(session.startedAt)}</div>
          </div>

          <div className={`${CARD} flex flex-col gap-2.5 py-3.5 pr-3 pl-4`}>
            <div className={CAPTION}>PLAYERS</div>
            <div className="flex items-center gap-2.5">
              <div className="flex shrink-0" aria-hidden>
                {inSession.slice(0, 4).map((p, i) => (
                  <Avatar
                    key={p.id}
                    player={p}
                    size={34}
                    className={`border-[2.5px] border-page ${i > 0 ? '-ml-2.5' : ''}`}
                  />
                ))}
              </div>
              <div className="min-w-0 flex-1 truncate text-[15px] font-extrabold">
                {inSession.length} {inSession.length === 1 ? 'player' : 'players'}
              </div>
              <button
                type="button"
                onClick={onEditPlayers}
                aria-label="Edit players in this session"
                className="flex h-10 shrink-0 items-center gap-1.5 rounded-control border-[1.5px] border-line-strong bg-white px-3 text-[13px] font-extrabold text-band-ink active:bg-soft"
              >
                <UserPlusIcon />
                Edit
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onGameCounts}
            className={`${CARD} flex items-center gap-3 py-3.5 pr-3 pl-4 text-left active:bg-soft`}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-white text-band">
              <BarsIcon />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[15px] font-extrabold">Game counts</span>
              <span className="text-[13px] text-muted">
                {games} {games === 1 ? 'game' : 'games'} played this session
              </span>
            </span>
            <ChevronRightIcon className="shrink-0 text-muted" />
          </button>
        </div>
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
