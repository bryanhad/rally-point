import { EMPTY_SLOT } from '../sports/badminton/game'
import type { Session, StoredSession } from '../sports/badminton/schema'
import { daysBetween, timeLabel } from '../sports/badminton/session'

// The home page's state, worked out from the data every time (never stored): first visit, the
// last (ended) session, or the ongoing one with what its next game needs.

export type NextGame =
  // The game is waiting for players: `missing` of `total` slots still to pick.
  | { kind: 'pick'; missing: number; total: number }
  // Every slot holds a session player: it can start as is (or the picks can change).
  | { kind: 'ready' }
  | { kind: 'in-progress' }

export type HomeState =
  | { kind: 'first-visit' }
  | { kind: 'last'; session: StoredSession }
  | { kind: 'ongoing'; session: Session; next: NextGame }

export function selectHome({
  current,
  past,
  awaitingPick,
  lineupIds,
}: {
  current: Session | null
  // Newest first.
  past: readonly StoredSession[]
  awaitingPick: boolean
  // Every court slot of the next (or current) game.
  lineupIds: readonly string[]
}): HomeState {
  if (current) {
    if (!awaitingPick) return { kind: 'ongoing', session: current, next: { kind: 'in-progress' } }
    const missing = lineupIds.filter((id) => id === EMPTY_SLOT || !current.playerIds.includes(id)).length
    return { kind: 'ongoing', session: current, next: missing === 0 ? { kind: 'ready' } : { kind: 'pick', missing, total: lineupIds.length } }
  }
  return past[0] ? { kind: 'last', session: past[0] } : { kind: 'first-visit' }
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const MONTH = 30 * DAY

// Compact duration in mo / d / h / m, leading zero units dropped: "45m", "1h 24m", "1d 3h 10m",
// "2mo 4d 1h 5m". Units after the first are always shown ("1h 0m"). A month is 30 days.
export function compactDuration(ms: number): string {
  let rest = Math.max(0, Math.floor(ms / MINUTE) * MINUTE)
  const parts: [number, string][] = []
  for (const [size, unit] of [[MONTH, 'mo'], [DAY, 'd'], [HOUR, 'h'], [MINUTE, 'm']] as const) {
    const n = Math.floor(rest / size)
    rest -= n * size
    if (n > 0 || parts.length > 0 || unit === 'm') parts.push([n, unit])
  }
  return parts.map(([n, unit]) => `${n}${unit}`).join(' ')
}

// The ongoing session's title: "Since 19:00" (today), "Since yesterday, 19:00", "Since 3d ago".
export function sinceTitle(startedAt: number, now: number): string {
  const days = daysBetween(startedAt, now)
  if (days <= 0) return `Since ${timeLabel(startedAt)}`
  if (days === 1) return `Since yesterday, ${timeLabel(startedAt)}`
  return `Since ${days}d ago`
}

// At most `max` avatars, then "+N" for the rest (none when everyone fits).
export function avatarCap<T>(items: readonly T[], max = 4): { shown: T[]; extra: number } {
  return { shown: items.slice(0, max), extra: Math.max(0, items.length - max) }
}

// Singles / Doubles on home always start a NEW session: right away when none is running,
// otherwise after "Start a new session?" (which ends the running one).
export function tileAction(home: HomeState): 'new-session' | 'confirm-new-session' {
  return home.kind === 'ongoing' ? 'confirm-new-session' : 'new-session'
}
