import type { HistoryEntry, Player, Session, TeamId } from './schema'
import { gameCounts } from './session'

// Per-player stats for the session player lists (Change player, Pick players). Pure, so the
// rules are easy to check.

export type PlayerStatus = 'on-court' | 'won-last' | 'played' | 'drew-last' | 'sat-out' | 'not-played'

export type PlayerStats = {
  player: Player
  // Finished session games played (the existing game count).
  games: number
  // Finished games in a row, ending at the last one, that they were in.
  streak: number
  // Finished games in a row, ending at the last one, that they weren't in (0 if they never played).
  satOut: number
  // In the winning team of the last finished game.
  wonLast: boolean
  // The team they're on now, when a game is in progress.
  onCourt: TeamId | null
  // First rule that matches, in this order.
  status: PlayerStatus
}

type StatsOptions = {
  // The newest match history entry of this session (its last finished game), if any.
  lastResult?: HistoryEntry | null
  // The lineup of the game in progress (Change player), to tell who's on court. It never counts
  // toward streaks or sat-out.
  inProgress?: Record<TeamId, readonly string[]> | null
}

const sideIds = (entry: HistoryEntry, side: 'left' | 'right') => entry[side].players.map((p) => p.id)

// Session players who are still in the session; players who left aren't listed.
export function sessionStats(session: Session, players: readonly Player[], options: StatsOptions = {}): PlayerStats[] {
  const { lastResult, inProgress } = options
  // Each finished game's players, oldest first.
  const games = session.games.map((g) => new Set(g.players.map((p) => p.id)))
  const winners = new Set(lastResult && lastResult.winner !== 'draw' ? sideIds(lastResult, lastResult.winner) : [])
  const drew = new Set(lastResult?.winner === 'draw' ? [...sideIds(lastResult, 'left'), ...sideIds(lastResult, 'right')] : [])

  return gameCounts(session, players)
    .filter((row) => !row.left)
    .map(({ player, games: gamesPlayed }) => {
      const id = player.id
      const onCourt = inProgress ? ((['a', 'b'] as const).find((t) => inProgress[t].includes(id)) ?? null) : null
      // Only finished games count: a game adds to the streak once it's played to the end, and
      // sitting out the game in progress isn't a game sat out yet.
      const played = games.map((g) => g.has(id))
      const streak = runFromEnd(played, (p) => p)
      const satOut = played.includes(true) ? runFromEnd(played, (p) => !p) : 0
      const wonLast = winners.has(id)
      const status: PlayerStatus = onCourt
        ? 'on-court'
        : wonLast
          ? 'won-last'
          : streak > 0
            ? streak === 1 && drew.has(id)
              ? 'drew-last'
              : 'played'
            : satOut > 0
              ? 'sat-out'
              : 'not-played'
      return { player, games: gamesPlayed, streak, satOut, wonLast, onCourt, status }
    })
}

function runFromEnd<T>(items: readonly T[], test: (item: T) => boolean): number {
  let n = 0
  for (let i = items.length - 1; i >= 0 && test(items[i]); i--) n++
  return n
}

const byNameCompare = (x: PlayerStats, y: PlayerStats) =>
  x.player.name.localeCompare(y.player.name, undefined, { sensitivity: 'base' })

// Change player: A–Z.
export function byName(rows: readonly PlayerStats[]): PlayerStats[] {
  return [...rows].sort(byNameCompare)
}

// Pick players: winners of the last game first, then fewest games, ties A–Z.
export function pickOrder(rows: readonly PlayerStats[]): PlayerStats[] {
  return [...rows].sort((x, y) => Number(y.wonLast) - Number(x.wonLast) || x.games - y.games || byNameCompare(x, y))
}

// Status line text (the row adds the icons and dots).
export function statusLabel(row: PlayerStats): string {
  switch (row.status) {
    case 'on-court':
      return 'On court'
    case 'won-last':
      return 'Won last game'
    case 'drew-last':
      return 'Drew last game'
    case 'played':
      return row.streak === 1 ? 'Played last game' : `Played ${row.streak} in a row`
    case 'sat-out':
      return 'Sat out'
    case 'not-played':
      return 'Not played yet'
  }
}
