import { z } from 'zod'
import { AVATAR_COLOR_NAMES, COLOR_MODES } from './avatarStyle'

// No version numbers: stored data is kept as long as it still parses. When adding a
// field later, give it `.default(...)` so older saved data keeps working.

export const GAME_KEY = 'rally-point:badminton:game'
export const PLAYERS_KEY = 'rally-point:badminton:players'
export const CONFIG_KEY = 'rally-point:badminton:config'
export const HISTORY_KEY = 'rally-point:badminton:history'
export const SESSION_KEY = 'rally-point:badminton:session'
export const SESSION_PLAYERS_KEY = 'rally-point:badminton:session-players'

export const playerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  // The auto (name-based) colour: picked when the player is created and again only when the
  // name changes. Players saved before colours existed get one on load; only old history
  // snapshots (e.g. of the removed Player 1–4 defaults) lack it and show grey. Old history snapshots of the removed Player 1–4 have none. `.catch` keeps bad colour data from resetting the roster.
  color: z.enum(AVATAR_COLOR_NAMES).optional().catch(undefined),
  // Which colour shows: auto (`color`), a preset (`presetId`) or a custom hue (`hue`).
  // Players saved before this existed load as auto.
  colorMode: z.enum(COLOR_MODES).catch('auto'),
  presetId: z.enum(AVATAR_COLOR_NAMES).optional().catch(undefined),
  hue: z.number().min(0).max(360).optional().catch(undefined),
})
export type Player = z.infer<typeof playerSchema>

// Teams keep their identity for the whole game; team A starts on the left of the screen.
export const teamIdSchema = z.enum(['a', 'b'])
export type TeamId = z.infer<typeof teamIdSchema>

// Doubles: index 0 stands in the team's right service court, index 1 in the left.
// '' is an empty spot waiting for a player.
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
  // Doubles partners trade courts mid-game (before the first rally it edits the start instead).
  z.object({ type: z.literal('swapPartners'), at: z.number(), team: teamIdSchema }),
])
export type GameEvent = z.infer<typeof gameEventSchema>

// Stored under GAME_KEY. Player ids missing from the roster are repaired during
// replay (the slot becomes empty), not treated as invalid.
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
  // In a session, each game starts with picking its players (or "Same players"); scoring
  // waits until then.
  awaitingPick: z.boolean().default(false),
})

// Stored under PLAYERS_KEY.
export const playersSchema = z.object({
  players: z.array(playerSchema),
})

export const modeSchema = z.enum(['singles', 'doubles'])

// A finished game in a session: who was on court when it ended. Name/colour snapshots, so a
// player deleted later still shows (as "Left") with their games.
const sessionGameSchema = z.object({
  endedAt: z.number(), // epoch milliseconds
  players: z.array(playerSchema).min(1).max(4),
})

// One evening of play and the games played in it. Game counts are derived from `games`, not
// from match history, so clearing history can't wipe them. Who's in it lives in
// SESSION_PLAYERS_KEY. (Saves from before that key had a `playerIds` list here; it is read once
// to fill the new key, then dropped.)
export const sessionSchema = z.object({
  id: z.string().min(1),
  startedAt: z.number(), // epoch milliseconds
  // The mode it started in; the live mode is config.mode and can change during the session.
  mode: modeSchema,
  // Oldest first.
  games: z.array(sessionGameSchema),
  // Last "Keep current session" on the 12-hour prompt; counts as activity.
  keptAt: z.number().optional(),
  // When End session was tapped (epoch ms). Sessions ended by starting a new one (before End
  // session existed) have none; their last game's end stands in.
  endedAt: z.number().optional(),
})
export type StoredSession = z.infer<typeof sessionSchema>

// Stored under SESSION_KEY. At most one running session; ended ones are kept for a later view.
export const sessionsSchema = z.object({
  current: sessionSchema.nullable(),
  // Newest first.
  past: z.array(sessionSchema),
})
export type Sessions = z.infer<typeof sessionsSchema>

// One player's place in one session (a table row: the key is sessionId + playerId). Players who
// played and were removed have no row and show as "left". Removing deletes the row, so coming
// back gets a new arrival.
export const sessionPlayerSchema = z.object({
  sessionId: z.string().min(1),
  playerId: z.string().min(1),
  // They arrived after this many finished games of the session: 0 = from the start.
  joinedAfterGame: z.number().int().min(0),
})
export type SessionPlayer = z.infer<typeof sessionPlayerSchema>

// Stored under SESSION_PLAYERS_KEY: the rows of every session, current and past.
export const sessionPlayersSchema = z.object({
  rows: z.array(sessionPlayerSchema),
})

// A session as the UI uses it: the stored session plus its players (in memory only).
export type Session = StoredSession & {
  members: SessionPlayer[]
  // members' player ids, in the same order.
  playerIds: string[]
}

// In memory the game, roster and sessions live together so one reducer keeps them in sync
// (e.g. ending a game counts it for the session); they are saved to separate keys.
export type GameState = z.infer<typeof storedGameSchema> &
  z.infer<typeof playersSchema> & { sessions: Sessions; sessionPlayers: SessionPlayer[] }

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
// Light background + dark text in each team colour, for tags and tinted cards on white.
export const TEAM_TINTS: Record<TeamColor, { bg: string; fg: string }> = {
  red: { bg: '#FDECEB', fg: '#A8322C' },
  blue: { bg: '#E6EDFB', fg: '#2452B8' },
  orange: { bg: '#FDEEE1', fg: '#9A4A12' },
  purple: { bg: '#F1E9FC', fg: '#6B37B5' },
  slate: { bg: '#E9ECF1', fg: '#3A4458' },
}
// Each team colour lightened for dark backgrounds (the notification card's score chip).
export const TEAM_ON_DARK: Record<TeamColor, string> = {
  red: '#E8796F',
  blue: '#7E9BF0',
  orange: '#F0A56B',
  purple: '#BC93EF',
  slate: '#A3AEC2',
}
const teamColorSchema = z.enum(Object.keys(TEAM_COLORS) as [TeamColor, ...TeamColor[]])

const sideSwitchSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('off') }),
  z.object({ kind: z.literal('every'), points: z.number().int().min(1) }),
  // Swap once when a side reaches ceil(totalPoints / 2).
  z.object({ kind: z.literal('half') }),
])
export type SideSwitch = z.infer<typeof sideSwitchSchema>

export const viewSchema = z.enum(['referee', 'facing'])
export type CourtView = z.infer<typeof viewSchema>

export const configSchema = z.object({
  totalPoints: z.number().int().min(1),
  sideSwitch: sideSwitchSchema,
  // CSS font-weight of the score digits.
  thickness: z.number().int().min(100).max(900),
  mode: modeSchema,
  // Last "every N" value, remembered while the rule is off or at half so it can be shown and reused.
  everyPoints: z.number().int().min(1).default(5),
  // `.catch` makes an unknown colour fall back on its own instead of resetting all settings.
  teamColors: z
    .object({ a: teamColorSchema.catch('red'), b: teamColorSchema.catch('blue') })
    .default({ a: 'red', b: 'blue' }),
  // How the court is drawn on this device: from the referee chair, or turned 180° for a scorer
  // sitting opposite. A view only: no game data depends on it.
  view: viewSchema.catch('referee'),
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
  // The session it was played in. Optional: games without a session, and older records.
  sessionId: z.string().optional(),
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
    // An empty court: players are picked onto it.
    start: { lineup: { a: [''], b: [''] }, server: 'a', leftTeam: 'a' },
    log: [],
    redoLog: null,
    gameNumber: 1,
    awaitingPick: false,
    sessions: defaultSessions(),
    sessionPlayers: [],
  }
}

export function defaultSessions(): Sessions {
  return { current: null, past: [] }
}

export function defaultConfig(): Config {
  return {
    totalPoints: 21,
    sideSwitch: { kind: 'off' },
    thickness: 700,
    mode: 'singles',
    everyPoints: 5,
    teamColors: { a: 'red', b: 'blue' },
    view: 'referee',
  }
}
