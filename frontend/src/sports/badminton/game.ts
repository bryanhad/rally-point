import { newId } from '../../lib/id'
import {
  DEFAULT_PLAYERS,
  type Config,
  type GameEvent,
  type GameState,
  type HistoryEntry,
  type Player,
  type TeamColor,
  type TeamId,
  TEAM_COLORS,
} from './schema'

export type SideKey = 'left' | 'right'
export type CourtSide = 'right' | 'left' // a team's own service court, as they face the net
export type Rules = Pick<Config, 'totalPoints' | 'sideSwitch'>

export const TEAM_IDS: readonly TeamId[] = ['a', 'b']
export const otherTeam = (team: TeamId): TeamId => (team === 'a' ? 'b' : 'a')

// Derived from replaying the log; never stored.
export type TeamState = {
  score: number
  // Doubles: ids[0] is in the team's right court, ids[1] in the left. Singles: one id.
  ids: string[]
}
export type CourtState = {
  teams: Record<TeamId, TeamState>
  server: TeamId
  leftTeam: TeamId // the team on the left half of the screen
}
export type LogStep = { event: GameEvent; before: CourtState; after: CourtState }
export type RallyStep = LogStep & { event: Extract<GameEvent, { type: 'rally' }> }

export type GameAction =
  | { type: 'rally'; team: TeamId; at: number; rules: Rules }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'swapEnds'; at: number }
  | { type: 'assignPlayer'; team: TeamId; slot: number; playerId: string; at: number }
  | { type: 'switchServer' }
  | { type: 'setMode'; mode: Config['mode'] }
  | { type: 'newGame' }
  | { type: 'restart' }
  | { type: 'addPlayer'; id: string; name: string }
  | { type: 'renamePlayer'; id: string; name: string }
  | { type: 'deletePlayer'; id: string }

export const MAX_NAME_LENGTH = 24

// Actions that don't start a different future, so the redo copy survives them.
const KEEPS_REDO: ReadonlySet<GameAction['type']> = new Set([
  'undo',
  'redo',
  'addPlayer',
  'renamePlayer',
  'deletePlayer',
])

export function gameReducer(state: GameState, action: GameAction): GameState {
  const next = applyAction(state, action)
  if (next === state || KEEPS_REDO.has(action.type) || next.redoLog === null) return next
  return { ...next, redoLog: null }
}

function applyAction(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'rally': {
      const { court } = replay(state)
      const score = court.teams[action.team].score + 1
      return append(state, {
        type: 'rally',
        at: action.at,
        winner: action.team,
        swapEnds: isSwapTrigger(score, action.rules),
      })
    }
    case 'undo':
      if (!state.log.length) return state
      // The first undo keeps a copy of the full log; later undos reuse it.
      return { ...state, log: state.log.slice(0, -1), redoLog: state.redoLog ?? state.log }
    case 'redo':
      // While only undo/redo happen, the log is always the start of the copy.
      if (!canRedo(state)) return state
      return { ...state, log: state.redoLog!.slice(0, state.log.length + 1) }
    case 'swapEnds':
      return append(state, { type: 'swapEnds', at: action.at })
    case 'assignPlayer': {
      if (hasRallies(state)) {
        const { team, slot, playerId, at } = action
        return append(state, { type: 'assignPlayer', team, slot, playerId, at })
      }
      // Nothing played yet: change the starting lineup instead of logging.
      const { court } = replay(state)
      const lineup = assignIds(lineupOf(court), action.team, action.slot, action.playerId)
      return { ...state, start: { ...state.start, lineup } }
    }
    case 'switchServer':
      if (hasRallies(state)) return state
      return { ...state, start: { ...state.start, server: otherTeam(state.start.server) } }
    case 'setMode':
      return newGame(state, action.mode)
    case 'restart':
      // Same starting lineup, ends and server; only the log is cleared.
      return { ...state, log: [] }
    case 'newGame':
      // Only reached after a game is ended and recorded, so this is where the counter moves on.
      return {
        ...newGame(state, state.start.lineup.a.length === 2 ? 'doubles' : 'singles'),
        gameNumber: state.gameNumber + 1,
      }
    case 'addPlayer': {
      // The form validates first; this guard keeps the reducer safe on its own.
      if (validateName(action.name, allPlayers(state))) return state
      return { ...state, players: [...state.players, { id: action.id, name: action.name.trim() }] }
    }
    case 'renamePlayer': {
      if (validateName(action.name, allPlayers(state), action.id)) return state
      const name = action.name.trim()
      return { ...state, players: state.players.map((p) => (p.id === action.id ? { ...p, name } : p)) }
    }
    case 'deletePlayer':
      // An on-court slot holding this player is filled with a free default during replay.
      return { ...state, players: state.players.filter((p) => p.id !== action.id) }
  }
}

// --- Replay -----------------------------------------------------------------

export function replay(state: GameState): { court: CourtState; steps: LogStep[] } {
  const known = new Set(allPlayers(state).map((p) => p.id))
  let court = repairCourt(
    {
      teams: {
        a: { score: 0, ids: [...state.start.lineup.a] },
        b: { score: 0, ids: [...state.start.lineup.b] },
      },
      server: state.start.server,
      leftTeam: state.start.leftTeam,
    },
    known,
  )
  const steps: LogStep[] = []
  for (const event of state.log) {
    const after = repairCourt(applyEvent(court, event), known)
    steps.push({ event, before: court, after })
    court = after
  }
  return { court, steps }
}

function applyEvent(court: CourtState, event: GameEvent): CourtState {
  switch (event.type) {
    case 'rally': {
      const winner = event.winner
      const team = court.teams[winner]
      const won = { ...team, score: team.score + 1 }
      // Serving team wins: partners switch courts and the same player serves again.
      // Receiving team wins: nobody moves; the serve passes to them.
      if (winner === court.server && won.ids.length === 2) won.ids = [won.ids[1], won.ids[0]]
      return {
        teams: { ...court.teams, [winner]: won },
        server: winner,
        leftTeam: event.swapEnds ? otherTeam(court.leftTeam) : court.leftTeam,
      }
    }
    case 'swapEnds':
      return { ...court, leftTeam: otherTeam(court.leftTeam) }
    case 'assignPlayer': {
      const lineup = assignIds(lineupOf(court), event.team, event.slot, event.playerId)
      return {
        ...court,
        teams: {
          a: { ...court.teams.a, ids: lineup.a },
          b: { ...court.teams.b, ids: lineup.b },
        },
      }
    }
  }
}

// --- Derived positions ------------------------------------------------------

// The server always stands in the court matching their team's score: even = right, odd = left.
export function serverId(court: CourtState): string {
  const team = court.teams[court.server]
  return team.ids.length === 2 ? team.ids[team.score % 2] : team.ids[0]
}

// The receiver stands in the same own court as the server (right to right, left to left),
// which is diagonally opposite on the court.
export function receiverId(court: CourtState): string {
  const serving = court.teams[court.server]
  const team = court.teams[otherTeam(court.server)]
  return team.ids.length === 2 ? team.ids[serving.score % 2] : team.ids[0]
}

// Which of their own service courts a player stands in.
export function courtOf(court: CourtState, team: TeamId, slot: number): CourtSide {
  if (court.teams[team].ids.length === 2) return slot === 0 ? 'right' : 'left'
  // Singles: both players stand in the court matching the server's score.
  return court.teams[court.server].score % 2 === 0 ? 'right' : 'left'
}

// Where a player appears on screen within their team's half. The left team faces right,
// so their own right court is at the bottom; the right team faces left, so theirs is at the top.
export function screenRow(court: CourtState, team: TeamId, slot: number): 'top' | 'bottom' {
  const ownRight = courtOf(court, team, slot) === 'right'
  return (sideOf(court, team) === 'left') === ownRight ? 'bottom' : 'top'
}

export function sideOf(court: CourtState, team: TeamId): SideKey {
  return court.leftTeam === team ? 'left' : 'right'
}

export function teamOn(court: CourtState, side: SideKey): TeamId {
  return side === 'left' ? court.leftTeam : otherTeam(court.leftTeam)
}

export function canRedo(state: GameState): boolean {
  return state.redoLog !== null && state.redoLog.length > state.log.length
}

export function hasRallies(state: GameState): boolean {
  return state.log.some((e) => e.type === 'rally')
}

// --- Toast text -------------------------------------------------------------

// Score as it reads on screen: left team first.
export function screenScore(court: CourtState): string {
  return `${court.teams[court.leftTeam].score}–${court.teams[otherTeam(court.leftTeam)].score}`
}

type NameOf = (id: string) => string

// What undoing this log entry did, for a toast.
export function describeUndo({ event, before, after }: LogStep, name: NameOf): string {
  switch (event.type) {
    case 'rally':
      return `Undid rally, back to ${screenScore(before)}${event.swapEnds ? '. Sides switched back' : ''}`
    case 'swapEnds':
      return 'Undid switch sides'
    case 'assignPlayer':
      return `${name(after.teams[event.team].ids[event.slot])} changed back to ${name(before.teams[event.team].ids[event.slot])}`
  }
}

// What redoing this log entry did, for a toast.
export function describeRedo({ event, before, after }: LogStep, name: NameOf): string {
  switch (event.type) {
    case 'rally':
      return `Redid rally, ${screenScore(after)}${event.swapEnds ? '. Players switched sides' : ''}`
    case 'swapEnds':
      return 'Redid switch sides'
    case 'assignPlayer':
      return `${name(before.teams[event.team].ids[event.slot])} changed to ${name(after.teams[event.team].ids[event.slot])} again`
  }
}

// --- Players ----------------------------------------------------------------

export function allPlayers(state: GameState): Player[] {
  return [...DEFAULT_PLAYERS, ...state.players]
}

// Returns an error message, or null when the name is acceptable.
// `exceptId` lets a player keep their own name (e.g. a change of case only).
export function validateName(name: string, players: Player[], exceptId?: string): string | null {
  const trimmed = name.trim()
  if (!trimmed) return 'Name cannot be empty'
  if (trimmed.length > MAX_NAME_LENGTH) return `Name must be ${MAX_NAME_LENGTH} characters or fewer`
  const lower = trimmed.toLowerCase()
  if (players.some((p) => p.id !== exceptId && p.name.toLowerCase() === lower)) {
    return 'That name is already taken'
  }
  return null
}

export function isSwapTrigger(score: number, { totalPoints, sideSwitch }: Rules): boolean {
  switch (sideSwitch.kind) {
    case 'off':
      return false
    case 'every':
      return score > 0 && score % sideSwitch.points === 0
    case 'half':
      return score === Math.ceil(totalPoints / 2)
  }
}

// Snapshot of the finished game; names are copied so later renames don't alter history.
export function createHistoryEntry(
  court: CourtState,
  players: Player[],
  winner: TeamId | 'draw',
  colors: Config['teamColors'],
  totalPoints: number,
): HistoryEntry {
  const byId = new Map(players.map((p) => [p.id, p]))
  const side = (team: TeamId) => ({
    score: court.teams[team].score,
    players: court.teams[team].ids.map((id) => byId.get(id) ?? { id, name: '?' }),
    // Hex snapshot so the record keeps its colour even if the palette changes later.
    color: TEAM_COLORS[colors[team]],
  })
  return {
    id: newId(),
    endedAt: Date.now(),
    left: side(teamOn(court, 'left')),
    right: side(teamOn(court, 'right')),
    winner: winner === 'draw' ? 'draw' : sideOf(court, winner),
    totalPoints,
  }
}

// Two teams can't share a colour; if a save says otherwise, B gets the first free one.
export function fixTeamColors(colors: Config['teamColors']): Config['teamColors'] {
  if (colors.a !== colors.b) return colors
  const free = (Object.keys(TEAM_COLORS) as TeamColor[]).find((c) => c !== colors.a)!
  return { ...colors, b: free }
}

// Starts a fresh game if the stored lineup doesn't match the mode (e.g. after a corrupted save).
export function repairGame(state: GameState, mode: Config['mode']): GameState {
  const size = mode === 'singles' ? 1 : 2
  const { a, b } = state.start.lineup
  return a.length === size && b.length === size ? state : newGame(state, mode)
}

// --- Internals --------------------------------------------------------------

function append(state: GameState, event: GameEvent): GameState {
  return { ...state, log: [...state.log, event] }
}

function lineupOf(court: CourtState): Record<TeamId, string[]> {
  return { a: court.teams.a.ids, b: court.teams.b.ids }
}

// Next game starts from where this one ended: teams keep their identity, ends and courts,
// and the team on the left serves first.
function newGame(state: GameState, mode: Config['mode']): GameState {
  const { court } = replay(state)
  const lineup = { a: [...court.teams.a.ids], b: [...court.teams.b.ids] }
  for (const team of TEAM_IDS) {
    if (mode === 'singles') lineup[team] = lineup[team].slice(0, 1)
    else if (lineup[team].length === 1) lineup[team].push(freeDefaultId([...lineup.a, ...lineup.b]))
  }
  return { ...state, start: { lineup, server: court.leftTeam, leftTeam: court.leftTeam }, log: [] }
}

// Lowest-numbered default player not currently on court.
function freeDefaultId(onCourt: string[]): string {
  const free = DEFAULT_PLAYERS.find((p) => !onCourt.includes(p.id))
  // With at most four slots and four defaults, one is always free once a slot is vacated.
  if (!free) throw new Error('No free default player')
  return free.id
}

// Puts a player into a slot; if they were already on court, a free default fills their old slot.
function assignIds(
  lineup: Record<TeamId, string[]>,
  team: TeamId,
  slot: number,
  playerId: string,
): Record<TeamId, string[]> {
  const ids = { a: [...lineup.a], b: [...lineup.b] }
  if (slot >= ids[team].length || ids[team][slot] === playerId) return lineup

  const fromTeam = TEAM_IDS.find((t) => ids[t].includes(playerId))
  const fromSlot = fromTeam ? ids[fromTeam].indexOf(playerId) : -1

  ids[team][slot] = playerId
  if (fromTeam) {
    ids[fromTeam][fromSlot] = ''
    ids[fromTeam][fromSlot] = freeDefaultId([...ids.a, ...ids.b])
  }
  return ids
}

// Ids missing from the roster (or duplicated) are replaced with free defaults,
// one slot at a time so each pick sees the previous ones.
function repairCourt(court: CourtState, known: Set<string>): CourtState {
  const seen = new Set<string>()
  const keep = (id: string) => {
    if (!known.has(id) || seen.has(id)) return ''
    seen.add(id)
    return id
  }
  const ids = { a: court.teams.a.ids.map(keep), b: court.teams.b.ids.map(keep) }
  if (![...ids.a, ...ids.b].includes('')) return court
  for (const team of TEAM_IDS) {
    ids[team].forEach((id, slot) => {
      if (!id) ids[team][slot] = freeDefaultId([...ids.a, ...ids.b])
    })
  }
  return {
    ...court,
    teams: { a: { ...court.teams.a, ids: ids.a }, b: { ...court.teams.b, ids: ids.b } },
  }
}
