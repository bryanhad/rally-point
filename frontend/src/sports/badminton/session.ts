import type { GameState, Player, Session, SessionPlayer, Sessions, StoredSession } from './schema'

// --- Session players ----------------------------------------------------------

// A stored session with its players attached, for the UI.
export function withPlayers(session: StoredSession, rows: readonly SessionPlayer[]): Session {
  const members = rows.filter((r) => r.sessionId === session.id)
  return { ...session, members, playerIds: members.map((r) => r.playerId) }
}

// The running session with its players, or null.
export function currentSession(state: Pick<GameState, 'sessions' | 'sessionPlayers'>): Session | null {
  const current = state.sessions.current
  return current ? withPlayers(current, state.sessionPlayers) : null
}

// Rows for saves from before SESSION_PLAYERS_KEY existed, built from each session's old
// `playerIds`. Arrivals weren't recorded then, so everyone counts as there from the start.
export function legacySessionPlayers(raw: unknown): SessionPlayer[] {
  if (!raw || typeof raw !== 'object') return []
  const { current, past } = raw as { current?: unknown; past?: unknown }
  const sessions = [current, ...(Array.isArray(past) ? past : [])]
  return sessions.flatMap((s) => {
    if (!s || typeof s !== 'object') return []
    const { id, playerIds } = s as { id?: unknown; playerIds?: unknown }
    if (typeof id !== 'string' || !id || !Array.isArray(playerIds)) return []
    return playerIds
      .filter((p): p is string => typeof p === 'string' && p.length > 0)
      .map((playerId) => ({ sessionId: id, playerId, joinedAfterGame: 0 }))
  })
}

// Keeps rows that belong to a known session, once per (session, player): the session key can
// reset on its own and must not leave players attached to nothing.
export function cleanSessionPlayers(rows: readonly SessionPlayer[], sessions: Sessions): SessionPlayer[] {
  const ids = new Set([sessions.current, ...sessions.past].flatMap((s) => (s ? [s.id] : [])))
  const seen = new Set<string>()
  return rows.filter((r) => {
    const key = `${r.sessionId}\u0000${r.playerId}`
    if (!ids.has(r.sessionId) || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// --- Game counts --------------------------------------------------------------

export type CountRow = {
  player: Player
  games: number
  // Session games since their last one (0 when they played the last game).
  satOut: number
  status: 'not-played' | 'last-game' | 'sat-out'
  // Played in the session but no longer in it (removed, or deleted from the roster).
  left: boolean
}

// Everyone in the session plus anyone who played and left, fewest games first, ties A–Z.
// The app only shows this; it never picks who plays next. Someone removed before playing a
// game isn't listed. Current names and colours are used; deleted players keep their snapshot.
export function gameCounts(session: Session, players: readonly Player[]): CountRow[] {
  const byId = new Map(players.map((p) => [p.id, p]))
  const played = new Map<string, { games: number; last: number; snapshot: Player }>()
  session.games.forEach((game, index) => {
    for (const p of game.players) {
      played.set(p.id, { games: (played.get(p.id)?.games ?? 0) + 1, last: index, snapshot: p })
    }
  })

  const inSession = new Set(session.playerIds)
  const ids = [...session.playerIds, ...[...played.keys()].filter((id) => !inSession.has(id))]
  const lastIndex = session.games.length - 1

  const rows: CountRow[] = []
  for (const id of ids) {
    const stats = played.get(id)
    const player = byId.get(id) ?? stats?.snapshot
    if (!player) continue
    const games = stats?.games ?? 0
    const satOut = stats ? lastIndex - stats.last : 0
    rows.push({
      player,
      games,
      satOut,
      status: games === 0 ? 'not-played' : satOut === 0 ? 'last-game' : 'sat-out',
      left: !inSession.has(id),
    })
  }
  return rows.sort(
    (x, y) => x.games - y.games || x.player.name.localeCompare(y.player.name, undefined, { sensitivity: 'base' }),
  )
}

export function statusText(row: CountRow): string {
  if (row.status === 'not-played') return 'Not played yet'
  if (row.status === 'last-game') return 'Played last game'
  return `Sat out ${row.satOut} ${row.satOut === 1 ? 'game' : 'games'}`
}

// "Game N" for the game about to be played.
export function nextGameNumber(session: Session): number {
  return session.games.length + 1
}

// --- Dates --------------------------------------------------------------------

const DAY = 24 * 60 * 60 * 1000

// Whole calendar days between two times, in local time (so 23:50 → 00:10 is one day).
export function daysBetween(from: number, to: number): number {
  const start = new Date(from)
  const end = new Date(to)
  const a = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())
  const b = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate())
  return Math.round((b - a) / DAY)
}

export function timeLabel(at: number): string {
  return new Date(at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

// How long a session has run: "1h 40m", "35m".
export function runningLabel(ms: number): string {
  const minutes = Math.max(0, Math.floor(ms / 60000))
  const h = Math.floor(minutes / 60)
  return h > 0 ? `${h}h ${minutes % 60}m` : `${minutes}m`
}

// "Today", "Yesterday", "3d ago" (2–6 days), then "12 Nov".
export function dayLabel(at: number, now = Date.now()): string {
  const days = daysBetween(at, now)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days >= 2 && days <= 6) return `${days}d ago`
  return new Date(at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// Session tile line: "Today · 19:00".
export function sessionDateLabel(at: number, now = Date.now()): string {
  return `${dayLabel(at, now)} · ${timeLabel(at)}`
}

// --- Activity -----------------------------------------------------------------

// When someone last did something that matters for the 12-hour prompt: scored or changed the
// court (log entries), finished a game, started the session, or chose to keep it. Opening the
// app doesn't count.
export function lastActivity(state: GameState): number | null {
  const times = state.log.map((e) => e.at)
  const current = state.sessions.current
  if (current) times.push(current.startedAt, ...current.games.map((g) => g.endedAt))
  if (current?.keptAt) times.push(current.keptAt)
  return times.length ? Math.max(...times) : null
}

export const IDLE_MS = 12 * 60 * 60 * 1000

// A session is running but nothing has happened for over 12 hours: time to ask about a new one.
export function isIdle(state: GameState, now = Date.now()): boolean {
  const last = lastActivity(state)
  return !!state.sessions.current && last !== null && now - last > IDLE_MS
}
