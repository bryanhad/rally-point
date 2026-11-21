import { describe, expect, it } from 'vitest'
import { sessionOrder, type QueueList } from './queue'
import type { HistoryEntry, Player, Session } from './schema'

const p = (name: string): Player => ({ id: name.toLowerCase(), name, colorMode: 'auto' })
const roster = ['Ana', 'Ben', 'Cal', 'Dee', 'Eli', 'Fay', 'Gus', 'Hal'].map(p)
const byName = new Map(roster.map((x) => [x.name, x]))
const P = (name: string) => byName.get(name)!

// games: who played each finished game, oldest first. members: name → joinedAfterGame.
function session(games: string[][], members: Record<string, number>): Session {
  const rows = Object.entries(members).map(([name, joinedAfterGame]) => ({
    sessionId: 's1',
    playerId: P(name).id,
    joinedAfterGame,
  }))
  return {
    id: 's1',
    startedAt: 0,
    mode: 'doubles',
    games: games.map((names, i) => ({ endedAt: i, players: names.map(P) })),
    members: rows,
    playerIds: rows.map((r) => r.playerId),
  }
}

function result(winners: string[], losers: string[]): HistoryEntry {
  const side = (names: string[]) => ({ score: 0, players: names.map(P) })
  return { id: 'h', endedAt: 0, left: side(winners), right: side(losers), winner: 'left' }
}

const order = (s: Session, list: QueueList, opts = {}) =>
  sessionOrder(s, roster, list, opts).map((e) => `${e.group}:${e.player.name}`)

describe('wait', () => {
  it('counts sat-out games only since arrival, with a newcomer at 1', () => {
    // 3 games played by Ana+Ben vs Cal+Dee.
    const games = [
      ['Ana', 'Ben', 'Cal', 'Dee'],
      ['Ana', 'Ben', 'Cal', 'Dee'],
      ['Ana', 'Ben', 'Cal', 'Dee'],
    ]
    const s = session(games, { Ana: 0, Ben: 0, Cal: 0, Dee: 0, Eli: 0, Fay: 1, Gus: 2, Hal: 3 })
    const wait = Object.fromEntries(sessionOrder(s, roster, 'pick').map((e) => [e.player.name, e.wait]))
    expect(wait).toMatchObject({ Eli: 3, Fay: 2, Gus: 1, Hal: 1, Ana: 0 })
  })

  it('sat out 2+ ranks ahead of a late joiner; sat out 1 is level (then fewer games, earlier arrival)', () => {
    const games = [
      ['Ana', 'Ben', 'Cal', 'Dee'],
      ['Ana', 'Ben', 'Eli', 'Fay'],
      ['Cal', 'Dee', 'Gus', 'Fay'],
    ]
    // Ana, Ben: sat out 1. Eli: sat out 1. Hal: just arrived (wait 1).
    const s = session(games, { Ana: 0, Ben: 0, Cal: 0, Dee: 0, Eli: 0, Fay: 0, Gus: 0, Hal: 3 })
    expect(order(s, 'pick').filter((x) => x.startsWith('waiting'))).toEqual([
      // wait 1 each; Hal has 0 games, Eli 1, Ana/Ben 2 (A–Z).
      'waiting:Hal',
      'waiting:Eli',
      'waiting:Ana',
      'waiting:Ben',
    ])
  })

  it('a player who sat out 3 is ahead of 2, 1 and a newcomer', () => {
    const games = [
      ['Ben', 'Cal', 'Dee', 'Eli'],
      ['Ana', 'Cal', 'Dee', 'Eli'],
      ['Ana', 'Ben', 'Dee', 'Eli'],
    ]
    // Fay sat out 3, Gus 2 (arrived after 1), Hal 1 (arrived after 2), Ana's partner none.
    const s = session(games, { Ana: 0, Ben: 0, Cal: 0, Dee: 0, Eli: 0, Fay: 0, Gus: 1, Hal: 3 })
    expect(order(s, 'pick').filter((x) => x.startsWith('waiting'))).toEqual([
      'waiting:Fay',
      'waiting:Gus',
      // wait 1: Cal (2 games) vs Hal (0 games) → fewer games first.
      'waiting:Hal',
      'waiting:Cal',
    ])
  })
})

describe('tie-breaks', () => {
  it('equal wait and games: earlier arrival, then A–Z', () => {
    const games = [['Ana', 'Ben', 'Cal', 'Dee']]
    // Eli and Fay sat out 1 from the start; Hal and Gus just arrived (wait 1, 0 games).
    const s = session(games, { Ana: 0, Ben: 0, Cal: 0, Dee: 0, Hal: 1, Gus: 1, Fay: 0, Eli: 0 })
    expect(order(s, 'pick').filter((x) => x.startsWith('waiting'))).toEqual([
      'waiting:Eli',
      'waiting:Fay',
      'waiting:Gus',
      'waiting:Hal',
    ])
  })

  it('just played: fewest games first, then A–Z', () => {
    const games = [
      ['Ana', 'Ben', 'Eli', 'Fay'],
      ['Ana', 'Dee', 'Cal', 'Ben'],
    ]
    const s = session(games, { Ana: 0, Ben: 0, Cal: 0, Dee: 0, Eli: 0, Fay: 0 })
    expect(order(s, 'pick').filter((x) => x.startsWith('just-played'))).toEqual([
      'just-played:Cal',
      'just-played:Dee',
      'just-played:Ana',
      'just-played:Ben',
    ])
  })
})

describe('winners', () => {
  const games = [
    ['Ana', 'Ben', 'Cal', 'Dee'],
    ['Ana', 'Ben', 'Eli', 'Fay'],
  ]
  const s = session(games, { Ana: 0, Ben: 0, Cal: 0, Dee: 0, Eli: 0, Fay: 0 })
  const lastResult = result(['Ana', 'Ben'], ['Eli', 'Fay'])

  it('Pick players: last winners on top, with their streak', () => {
    const rows = sessionOrder(s, roster, 'pick', { lastResult })
    expect(rows.map((e) => `${e.group}:${e.player.name}`)).toEqual([
      'just-won:Ana',
      'just-won:Ben',
      'waiting:Cal',
      'waiting:Dee',
      'just-played:Eli',
      'just-played:Fay',
    ])
    expect(rows[0].streak).toBe(2)
    expect(rows[0].wonLast).toBe(true)
  })

  it('Change player has no winners band: winners are just played, on court comes last', () => {
    const onCourt = { a: ['ana', 'cal'], b: ['dee', 'eli'] }
    expect(order(s, 'change', { lastResult, onCourt })).toEqual([
      // Fay 1 game, Ben 2: fewest first.
      'just-played:Fay',
      'just-played:Ben',
      'on-court:Ana',
      'on-court:Cal',
      'on-court:Dee',
      'on-court:Eli',
    ])
  })

  it('a draw has no winners', () => {
    const draw = { ...lastResult, winner: 'draw' as const }
    expect(order(s, 'pick', { lastResult: draw })[0]).toBe('waiting:Cal')
  })
})

describe('players who left', () => {
  const games = [['Ana', 'Ben', 'Cal', 'Dee']]
  // Dee played and left; Hal was added and removed without playing.
  const s = session(games, { Ana: 0, Ben: 0, Cal: 0, Eli: 0 })

  it('are not listed in Pick players or Change player', () => {
    expect(order(s, 'pick')).not.toContain('left:Dee')
    expect(order(s, 'change').some((x) => x.includes('Dee'))).toBe(false)
  })

  it('come last in Current Session, A–Z; someone who never played is not listed', () => {
    const rows = order(s, 'session')
    expect(rows.at(-1)).toBe('left:Dee')
    expect(rows.some((x) => x.includes('Hal'))).toBe(false)
  })

  it('a deleted player still shows from their game snapshot', () => {
    const rows = sessionOrder(s, roster.filter((x) => x.name !== 'Dee'), 'session')
    expect(rows.at(-1)?.player.name).toBe('Dee')
  })

  it('coming back gets a new arrival: wait counts from the new row', () => {
    const back = session(
      [
        ['Ana', 'Ben', 'Cal', 'Dee'],
        ['Ana', 'Ben', 'Cal', 'Eli'],
        ['Ana', 'Ben', 'Cal', 'Eli'],
      ],
      { Ana: 0, Ben: 0, Cal: 0, Eli: 0, Dee: 3 },
    )
    const dee = sessionOrder(back, roster, 'pick').find((e) => e.player.name === 'Dee')!
    expect(dee).toMatchObject({ group: 'waiting', satOut: 0, wait: 1, games: 1 })
  })
})

describe('Current Session order', () => {
  it('waiting → just played → on court → left', () => {
    const games = [['Ana', 'Ben', 'Cal', 'Dee']]
    const s = session(games, { Ana: 0, Ben: 0, Cal: 0, Eli: 0, Fay: 0, Gus: 0 })
    const onCourt = { a: ['eli', 'ana'], b: ['fay', 'gus'] }
    expect(order(s, 'session', { onCourt })).toEqual([
      'just-played:Ben',
      'just-played:Cal',
      'on-court:Eli',
      'on-court:Ana',
      'on-court:Fay',
      'on-court:Gus',
      'left:Dee',
    ])
  })
})
