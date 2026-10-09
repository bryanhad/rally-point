import { z } from 'zod'

// No version numbers: stored data is kept as long as it still parses. When adding a
// field later, give it `.default(...)` so older saved data keeps working.

export const GAME_KEY = 'rally-point:badminton:game'
export const PLAYERS_KEY = 'rally-point:badminton:players'
export const CONFIG_KEY = 'rally-point:badminton:config'
export const HISTORY_KEY = 'rally-point:badminton:history'

export const playerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
})
export type Player = z.infer<typeof playerSchema>

// Read-only defaults. Never stored; always available alongside custom players.
export const DEFAULT_PLAYERS: readonly Player[] = [1, 2, 3, 4].map((n) => ({
  id: `default-${n}`,
  name: `Player ${n}`,
}))

// Teams keep their identity for the whole game; team A starts on the left of the screen.
export const teamIdSchema = z.enum(['a', 'b'])
export type TeamId = z.infer<typeof teamIdSchema>

// Doubles: index 0 stands in the team's right service court, index 1 in the left.
const lineupIdsSchema = z.array(z.string()).min(1).max(2)

// Everything that changes the flow of a game. State (score, server, positions, ends)
// is never stored; it is derived by replaying these events from the start.
const gameEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('rally'),
    at: z.number(),
    winner: teamIdSchema,
    // True when this rally triggered the automatic change of ends.
    swapEnds: z.boolean().default(false),
  }),
  z.object({ type: z.literal('swapEnds'), at: z.number() }),
  z.object({
    type: z.literal('assignPlayer'),
    at: z.number(),
    team: teamIdSchema,
    slot: z.number().int().min(0).max(1),
    playerId: z.string(),
  }),
])
export type GameEvent = z.infer<typeof gameEventSchema>

// Stored under GAME_KEY. Player ids missing from the roster are repaired during
// replay (a free default takes the slot), not treated as invalid.
export const storedGameSchema = z.object({
  start: z.object({
    lineup: z.object({ a: lineupIdsSchema, b: lineupIdsSchema }),
    server: teamIdSchema,
    // Teams keep their identity (and colour) across games, so A may start on either end.
    leftTeam: teamIdSchema.default('a'),
  }),
  // Oldest first.
  log: z.array(gameEventSchema),
  // Copy of the log taken at the first undo, so undone entries can be redone.
  // Discarded by any other game action.
  redoLog: z.array(gameEventSchema).nullable().default(null),
  // Which game this is: +1 each time a game is ended and recorded (reset and mode change keep it).
  gameNumber: z.number().int().min(1).default(1),
})

// Stored under PLAYERS_KEY. Custom players only; DEFAULT_PLAYERS are added at runtime.
export const playersSchema = z.object({
  players: z.array(playerSchema),
})

// In memory the game and roster live together so one reducer keeps them in sync;
// they are saved to separate keys.
export type GameState = z.infer<typeof storedGameSchema> & z.infer<typeof playersSchema>

// Team colours. Stored by name so a shade can be tweaked here without invalidating saves.
// No green: it would disappear against the court.
export const TEAM_COLORS = {
  red: '#DD534C',
  blue: '#2F62D6',
  orange: '#E8833A',
  purple: '#9B5DE5',
  slate: '#4A5568',
} as const
export type TeamColor = keyof typeof TEAM_COLORS
const teamColorSchema = z.enum(Object.keys(TEAM_COLORS) as [TeamColor, ...TeamColor[]])

const sideSwitchSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('off') }),
  z.object({ kind: z.literal('every'), points: z.number().int().min(1) }),
  // Swap once when a side reaches ceil(totalPoints / 2).
  z.object({ kind: z.literal('half') }),
])
export type SideSwitch = z.infer<typeof sideSwitchSchema>

export const configSchema = z.object({
  totalPoints: z.number().int().min(1),
  sideSwitch: sideSwitchSchema,
  // CSS font-weight of the score digits.
  thickness: z.number().int().min(100).max(900),
  mode: z.enum(['singles', 'doubles']),
  // Last "every N" value, remembered while the rule is off or at half so it can be shown and reused.
  everyPoints: z.number().int().min(1).default(5),
  // `.catch` makes an unknown colour fall back on its own instead of resetting all settings.
  teamColors: z
    .object({ a: teamColorSchema.catch('red'), b: teamColorSchema.catch('blue') })
    .default({ a: 'red', b: 'blue' }),
})
export type Config = z.infer<typeof configSchema>

const historySideSchema = z.object({
  score: z.number().int().min(0),
  // Name snapshots at the time the game ended; never updated afterwards.
  players: z.array(playerSchema).min(1).max(2),
  // Team colour (hex) at the time the game ended. Optional: older records have none.
  color: z.string().optional(),
})

const historyEntrySchema = z.object({
  id: z.string().min(1),
  endedAt: z.number(), // epoch milliseconds
  left: historySideSchema,
  right: historySideSchema,
  winner: z.enum(['left', 'right', 'draw']),
  // Points to win when the game was played. Optional: older records don't have it.
  totalPoints: z.number().int().min(1).optional(),
})
export type HistoryEntry = z.infer<typeof historyEntrySchema>

export const historySchema = z.object({
  // Newest first.
  entries: z.array(historyEntrySchema),
})
export type History = z.infer<typeof historySchema>

export function defaultHistory(): History {
  return { entries: [] }
}

export function defaultGame(): GameState {
  return {
    players: [],
    start: { lineup: { a: ['default-1'], b: ['default-2'] }, server: 'a', leftTeam: 'a' },
    log: [],
    redoLog: null,
    gameNumber: 1,
  }
}

export function defaultConfig(): Config {
  return {
    totalPoints: 21,
    sideSwitch: { kind: 'off' },
    thickness: 700,
    mode: 'singles',
    everyPoints: 5,
    teamColors: { a: 'red', b: 'blue' },
  }
}
