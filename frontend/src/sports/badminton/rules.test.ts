import { describe, expect, it } from 'vitest'
import { afterRally, gamePointTeam, inDeuce, isDeuceTie, type Scores } from './rules'

const s = (a: number, b: number): Scores => ({ a, b })
const T = 21

describe('afterRally (the toasts, forward taps only)', () => {
  it('20–18 → 20–20 → 21–20 → 21–21 → 23–21 alternates game point and deuce', () => {
    expect(afterRally(s(19, 18), 'a', T)).toBe('game-point') // 20–18
    expect(afterRally(s(20, 19), 'b', T)).toBe('deuce') // 20–20
    expect(afterRally(s(20, 20), 'a', T)).toBe('game-point') // 21–20
    expect(afterRally(s(21, 20), 'b', T)).toBe('deuce') // 21–21
    expect(afterRally(s(21, 21), 'a', T)).toBe('game-point') // 22–21
    expect(afterRally(s(22, 21), 'a', T)).toBe('won') // 23–21
  })

  it('no deuce below (T−1)–(T−1), and every new tie in deuce counts', () => {
    expect(afterRally(s(18, 19), 'a', T)).toBe(null) // 19–19
    expect(afterRally(s(29, 30), 'a', T)).toBe('deuce') // 30–30, no cap
  })

  it('T = 1: 0–0 is the start, not a deuce; 1–1 is', () => {
    expect(isDeuceTie(s(0, 0), 1)).toBe(false)
    expect(afterRally(s(0, 1), 'a', 1)).toBe('deuce')
  })
})

describe('inDeuce (the ring, derived from the score)', () => {
  it('from the first deuce until the game ends', () => {
    expect(inDeuce(s(20, 19), T)).toBe(false)
    expect(inDeuce(s(20, 20), T)).toBe(true)
    expect(inDeuce(s(21, 20), T)).toBe(true) // game point inside deuce: ring stays
    expect(inDeuce(s(23, 21), T)).toBe(false) // won
  })

  it('Undo back below (T−1)–(T−1) removes it', () => {
    expect(inDeuce(s(20, 19), T)).toBe(false)
  })

  it('game point and deuce can show together', () => {
    expect(gamePointTeam(s(22, 21), T)).toBe('a')
    expect(inDeuce(s(22, 21), T)).toBe(true)
  })
})
