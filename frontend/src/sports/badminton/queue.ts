import type { HistoryEntry, Player, Session, TeamId } from './schema'

// Who should play next: the order of the session players lists (Pick players, Change player,
// Current Session). Pure, so the fairness rule is easy to check.
//
// Wait = finished games in a row a player has sat out, counted only from when they arrived.
// Someone who has arrived but not sat out a game yet counts as a wait of 1, so a player who has
// sat out 2+ games ranks ahead of a newcomer, and one who has sat out 1 is level with them.

export type QueueGroup = 'just-won' | 'waiting' | 'just-played' | 'on-court' | 'left'

// Which list is being shown; each has its own groups, in this order.
export type QueueList = 'pick' | 'change' | 'session'

const GROUPS: Record<QueueList, readonly QueueGroup[]> = {
  // "Who should be picked next?" Last game's winners on top as their reward.
  pick: ['just-won', 'waiting', 'just-played'],
  // Same, without the winners' band; the game in progress is on court.
  change: ['waiting', 'just-played', 'on-court'],
  session: ['waiting', 'just-played', 'on-court', 'left'],
}

export type QueueEntry = {
  player: Player
  group: QueueGroup
  // Finished session games played.
  games: number
  // Finished games in a row, ending at the last one, that they were in.
  streak: number
  // Finished games in a row, ending at the last one, that they sat out since arriving.
  satOut: number
  // The queue rank: satOut, but at least 1 once arrived (0 if they played the last game).
  wait: number
  // In the winning team of the last finished game.
  wonLast: boolean
  // Team in the game in progress, if on court.
  onCourt: TeamId | null
  // Arrived after this many finished games (null for players who left).
  joinedAfterGame: number | null
}

type QueueOptions = {
  // The newest match history entry of this session (its last finished game), if any.
  lastResult?: HistoryEntry | null
  // The lineup of the game in progress. Never counts toward streaks or sat-out.
  onCourt?: Record<TeamId, readonly string[]> | null
}

const byName = (x: QueueEntry, y: QueueEntry) =>
  x.player.name.localeCompare(y.player.name, undefined, { sensitivity: 'base' })

const COMPARE: Record<Exclude<QueueGroup, 'on-court'>, (x: QueueEntry, y: QueueEntry) => number> = {
  // Fewest games first, then A–Z.
  'just-won': (x, y) => x.games - y.games || byName(x, y),
  // Longest wait first; ties: fewer games, earlier arrival, A–Z.
  waiting: (x, y) =>
    y.wait - x.wait || x.games - y.games || (x.joinedAfterGame ?? 0) - (y.joinedAfterGame ?? 0) || byName(x, y),
  'just-played': (x, y) => x.games - y.games || byName(x, y),
  left: byName,
}

export function sessionOrder(
  session: Session,
  players: readonly Player[],
  list: QueueList,
  { lastResult, onCourt }: QueueOptions = {},
): QueueEntry[] {
  const byId = new Map(players.map((p) => [p.id, p]))
  const games = session.games.map((g) => new Set(g.players.map((p) => p.id)))
  const lastGame = games.at(-1)
  const winners = new Set(
    lastResult && lastResult.winner !== 'draw' ? lastResult[lastResult.winner].players.map((p) => p.id) : [],
  )
  const lineup = onCourt ? [...onCourt.a, ...onCourt.b] : []
  const teamOf = (id: string): TeamId | null =>
    onCourt ? ((['a', 'b'] as const).find((t) => onCourt[t].includes(id)) ?? null) : null

  // Players who played and have no row: left. Latest snapshot for deleted players.
  const snapshots = new Map<string, Player>()
  for (const g of session.games) for (const p of g.players) snapshots.set(p.id, p)
  const members = new Map(session.members.map((m) => [m.playerId, m.joinedAfterGame] as const))
  const ids = [...members.keys(), ...[...snapshots.keys()].filter((id) => !members.has(id))]

  const entries: QueueEntry[] = []
  for (const id of ids) {
    const player = byId.get(id) ?? snapshots.get(id)
    if (!player) continue
    const joined = members.get(id) ?? null
    const played = games.map((g) => g.has(id))
    const streak = runFromEnd(played, true)
    const satOut = joined === null ? 0 : runFromEnd(played.slice(joined), false)
    const wonLast = winners.has(id) && !!lastGame?.has(id)
    const team = teamOf(id)
    const group: QueueGroup =
      joined === null
        ? 'left'
        : team
          ? 'on-court'
          : wonLast
            ? 'just-won'
            : lastGame?.has(id)
              ? 'just-played'
              : 'waiting'
    entries.push({
      player,
      group,
      games: played.filter(Boolean).length,
      streak,
      satOut,
      wait: lastGame?.has(id) ? 0 : Math.max(satOut, 1),
      wonLast,
      onCourt: team,
      joinedAfterGame: joined,
    })
  }

  const groups = GROUPS[list]
  // A group a list doesn't show folds into the nearest one it does: winners are just players
  // who played the last game, and with no game in progress nobody is on court.
  const shownGroup = (e: QueueEntry): QueueGroup | null => {
    if (groups.includes(e.group)) return e.group
    if (e.group === 'just-won') return 'just-played'
    if (e.group === 'on-court') {
      if (e.wonLast && groups.includes('just-won')) return 'just-won'
      return lastGame?.has(e.player.id) ? 'just-played' : 'waiting'
    }
    return null // left, where the list doesn't show them
  }

  // On court: lineup order (team A, then B).
  const compare = (group: QueueGroup) =>
    group === 'on-court'
      ? (x: QueueEntry, y: QueueEntry) => lineup.indexOf(x.player.id) - lineup.indexOf(y.player.id)
      : COMPARE[group]

  return groups.flatMap((group) =>
    entries
      .filter((e) => shownGroup(e) === group)
      .map((e) => ({ ...e, group }))
      .sort(compare(group)),
  )
}

function runFromEnd(items: readonly boolean[], value: boolean): number {
  let n = 0
  for (let i = items.length - 1; i >= 0 && items[i] === value; i--) n++
  return n
}
