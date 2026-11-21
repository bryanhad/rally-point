import { describe, expect, it } from 'vitest'
import type { CourtState } from './game'
import { initialPick, pickReducer, screenOrder } from './pick'

const court = (leftTeam: 'a' | 'b'): CourtState => ({
  teams: { a: { score: 0, ids: [] }, b: { score: 0, ids: [] } },
  server: 'a',
  leftTeam,
})
const names = (order: { team: string; slot: number }[]) => order.map((r) => `${r.team}${r.slot}`)

describe('screenOrder', () => {
  it('doubles, referee view: top-left, bottom-left, top-right, bottom-right', () => {
    // Left team: own right court (slot 0) is at the bottom; right team: slot 0 at the top.
    expect(names(screenOrder(court('a'), 2, 'referee'))).toEqual(['a1', 'a0', 'b0', 'b1'])
  })
  it('doubles, facing referee: the team drawn on the left comes first, still top to bottom', () => {
    expect(names(screenOrder(court('a'), 2, 'facing'))).toEqual(['b1', 'b0', 'a0', 'a1'])
  })
  it('follows the ends', () => {
    expect(names(screenOrder(court('b'), 2, 'referee'))).toEqual(['b1', 'b0', 'a0', 'a1'])
  })
  it('singles: left team, then right team', () => {
    expect(names(screenOrder(court('a'), 1, 'referee'))).toEqual(['a0', 'b0'])
    expect(names(screenOrder(court('a'), 1, 'facing'))).toEqual(['b0', 'a0'])
  })
  it('picks fill in screen order', () => {
    const order = screenOrder(court('a'), 2, 'referee')
    let s = initialPick(2, order)
    for (const id of ['p', 'q', 'r', 's']) s = pickReducer(s, { type: 'tapPlayer', id }, order)
    expect(s.slots).toEqual({ a: ['q', 'p'], b: ['r', 's'] })
  })
})

describe('reorder (view flipped)', () => {
  it('moves the active slot to the first empty slot of the new order', () => {
    const referee = screenOrder(court('a'), 2, 'referee')
    const facing = screenOrder(court('a'), 2, 'facing')
    let s = initialPick(2, referee)
    expect(s.active).toEqual({ team: 'a', slot: 1 })
    s = pickReducer(s, { type: 'reorder' }, facing)
    expect(s.active).toEqual({ team: 'b', slot: 1 })
    s = pickReducer(s, { type: 'tapPlayer', id: 'p' }, facing)
    s = pickReducer(s, { type: 'reorder' }, referee)
    expect(s.active).toEqual({ team: 'a', slot: 1 })
  })
})
