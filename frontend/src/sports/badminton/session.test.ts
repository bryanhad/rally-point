import { describe, expect, it } from 'vitest'
import { gameReducer, screenScore } from './game'
import { configSchema, defaultConfig, defaultGame, sessionsSchema, type GameState } from './schema'
import { cleanSessionPlayers, currentSession, legacySessionPlayers, runningLabel } from './session'
import { viewRow, viewSide } from './view'

const player = (id: string) => ({ id, name: id.toUpperCase(), colorMode: 'auto' as const })

describe('migration from session.playerIds', () => {
  const legacy = {
    current: { id: 'now', startedAt: 2, mode: 'doubles', playerIds: ['a', 'b'], games: [] },
    past: [{ id: 'old', startedAt: 1, mode: 'singles', playerIds: ['c'], games: [] }],
  }

  it('builds rows for every session, all from the start', () => {
    expect(legacySessionPlayers(legacy)).toEqual([
      { sessionId: 'now', playerId: 'a', joinedAfterGame: 0 },
      { sessionId: 'now', playerId: 'b', joinedAfterGame: 0 },
      { sessionId: 'old', playerId: 'c', joinedAfterGame: 0 },
    ])
  })

  it('the session key still parses (playerIds dropped)', () => {
    const parsed = sessionsSchema.parse(legacy)
    expect(parsed.current).not.toHaveProperty('playerIds')
  })

  it('ignores junk', () => {
    expect(legacySessionPlayers(null)).toEqual([])
    expect(legacySessionPlayers({ current: { id: 'x', playerIds: 'nope' }, past: 'nope' })).toEqual([])
  })
})

describe('cleanSessionPlayers', () => {
  const sessions = sessionsSchema.parse({ current: { id: 'now', startedAt: 0, mode: 'singles', games: [] }, past: [] })

  it('drops rows of unknown sessions and duplicates', () => {
    const rows = [
      { sessionId: 'now', playerId: 'a', joinedAfterGame: 0 },
      { sessionId: 'now', playerId: 'a', joinedAfterGame: 2 },
      { sessionId: 'gone', playerId: 'b', joinedAfterGame: 0 },
    ]
    expect(cleanSessionPlayers(rows, sessions)).toEqual([{ sessionId: 'now', playerId: 'a', joinedAfterGame: 0 }])
  })
})

describe('reducer: session players', () => {
  const base: GameState = { ...defaultGame(), players: ['a', 'b', 'c', 'd', 'e'].map(player) }
  const started = gameReducer(base, { type: 'startSession', id: 's1', startedAt: 0, mode: 'singles', playerIds: ['a', 'b', 'x'] })
  // Two games finished.
  const withGames: GameState = {
    ...started,
    sessions: {
      ...started.sessions,
      current: { ...started.sessions.current!, games: [{ endedAt: 1, players: [player('a'), player('b')] }, { endedAt: 2, players: [player('a'), player('b')] }] },
    },
  }

  it('startSession: known players, from the start', () => {
    expect(currentSession(started)!.members).toEqual([
      { sessionId: 's1', playerId: 'a', joinedAfterGame: 0 },
      { sessionId: 's1', playerId: 'b', joinedAfterGame: 0 },
    ])
  })

  it('setSessionPlayers: existing keep their arrival, new ones arrive now, removed lose their row', () => {
    const next = gameReducer(withGames, { type: 'setSessionPlayers', playerIds: ['a', 'c'] })
    expect(currentSession(next)!.members).toEqual([
      { sessionId: 's1', playerId: 'a', joinedAfterGame: 0 },
      { sessionId: 's1', playerId: 'c', joinedAfterGame: 2 },
    ])
    // Leave and come back: a new arrival.
    const back = gameReducer(next, { type: 'setSessionPlayers', playerIds: ['a', 'c', 'b'] })
    expect(currentSession(back)!.members.find((m) => m.playerId === 'b')?.joinedAfterGame).toBe(2)
  })

  it('joinSession: arrives after the given game (clamped to 0..games played); already in: unchanged', () => {
    const fromStart = gameReducer(withGames, { type: 'joinSession', playerId: 'c', joinedAfterGame: 0 })
    expect(currentSession(fromStart)!.members.find((m) => m.playerId === 'c')?.joinedAfterGame).toBe(0)
    const afterOne = gameReducer(withGames, { type: 'joinSession', playerId: 'c', joinedAfterGame: 1 })
    expect(currentSession(afterOne)!.members.find((m) => m.playerId === 'c')?.joinedAfterGame).toBe(1)
    const late = gameReducer(withGames, { type: 'joinSession', playerId: 'c', joinedAfterGame: 9 })
    expect(currentSession(late)!.members.find((m) => m.playerId === 'c')?.joinedAfterGame).toBe(2)
    expect(gameReducer(withGames, { type: 'joinSession', playerId: 'a', joinedAfterGame: 2 })).toBe(withGames)
    expect(gameReducer(withGames, { type: 'joinSession', playerId: 'nobody', joinedAfterGame: 0 })).toBe(withGames)
  })

  it('endSession: the session moves to the past with its end time; the court is cleared', () => {
    const playing: GameState = { ...withGames, awaitingPick: false, log: [{ type: 'swapEnds', at: 5 }] }
    const ended = gameReducer(playing, { type: 'endSession', at: 99 })
    expect(ended.sessions.current).toBeNull()
    expect(ended.sessions.past[0]).toMatchObject({ id: 's1', endedAt: 99, games: withGames.sessions.current!.games })
    expect(ended.log).toEqual([])
    expect(gameReducer(ended, { type: 'endSession', at: 100 })).toBe(ended)
  })

  it('a new session keeps the old rows (for past sessions) and adds its own', () => {
    const next = gameReducer(withGames, { type: 'startSession', id: 's2', startedAt: 3, mode: 'singles', playerIds: ['c'] })
    expect(next.sessionPlayers.filter((r) => r.sessionId === 's1')).toHaveLength(2)
    expect(currentSession(next)!.playerIds).toEqual(['c'])
  })

  it('deletePlayer removes their row from the running session only', () => {
    const next = gameReducer(withGames, { type: 'startSession', id: 's2', startedAt: 3, mode: 'singles', playerIds: ['a'] })
    const deleted = gameReducer(next, { type: 'deletePlayer', id: 'a' })
    expect(currentSession(deleted)!.playerIds).toEqual([])
    expect(deleted.sessionPlayers.some((r) => r.sessionId === 's1' && r.playerId === 'a')).toBe(true)
  })
})

describe('view setting', () => {
  it('defaults to Referee view; bad or missing values fall back without resetting settings', () => {
    const { view: _view, ...old } = defaultConfig()
    expect(configSchema.parse(old).view).toBe('referee')
    expect(configSchema.parse({ ...old, view: 'sideways' }).view).toBe('referee')
    expect(configSchema.parse({ ...old, view: 'facing' }).view).toBe('facing')
  })

  it('Facing referee turns the court 180°: left ↔ right and top ↔ bottom', () => {
    expect(viewSide('left', 'facing')).toBe('right')
    expect(viewRow('top', 'facing')).toBe('bottom')
    expect(viewSide('left', 'referee')).toBe('left')
    expect(viewRow(viewRow('top', 'facing'), 'facing')).toBe('top')
  })

  it('score text reads in screen order: the team drawn on the left first', () => {
    const court = {
      teams: { a: { score: 5, ids: ['a'] }, b: { score: 3, ids: ['b'] } },
      server: 'a' as const,
      leftTeam: 'a' as const,
    }
    expect(screenScore(court, 'referee')).toBe('5–3')
    expect(screenScore(court, 'facing')).toBe('3–5')
  })

  it('is not part of the game state, so flipping it cannot change the game or its undo log', () => {
    expect(Object.keys(defaultGame())).not.toContain('view')
  })
})

describe('runningLabel', () => {
  it('minutes under an hour, then hours and minutes', () => {
    expect(runningLabel(0)).toBe('0m')
    expect(runningLabel(35 * 60000 + 59000)).toBe('35m')
    expect(runningLabel(60 * 60000)).toBe('1h 0m')
    expect(runningLabel(100 * 60000)).toBe('1h 40m')
    expect(runningLabel(-5000)).toBe('0m')
  })
})
