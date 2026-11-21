import { describe, expect, it } from 'vitest'
import type { Session, StoredSession } from '../sports/badminton/schema'
import { avatarCap, compactDuration, selectHome, sinceTitle, tileAction } from './homeState'

const M = 60_000
const H = 60 * M
const D = 24 * H

describe('compactDuration', () => {
  it('drops leading zero units', () => {
    expect(compactDuration(45 * M)).toBe('45m')
    expect(compactDuration(84 * M)).toBe('1h 24m')
    expect(compactDuration(D + 3 * H + 10 * M)).toBe('1d 3h 10m')
    expect(compactDuration(2 * 30 * D + 4 * D + H + 5 * M)).toBe('2mo 4d 1h 5m')
  })
  it('keeps inner zeros, rounds down to the minute, never negative', () => {
    expect(compactDuration(H)).toBe('1h 0m')
    expect(compactDuration(D + 5 * M)).toBe('1d 0h 5m')
    expect(compactDuration(59_999)).toBe('0m')
    expect(compactDuration(-5 * M)).toBe('0m')
  })
})

describe('sinceTitle', () => {
  const now = new Date(2026, 10, 21, 21, 0).getTime()
  it('today, yesterday, then days ago', () => {
    expect(sinceTitle(new Date(2026, 10, 21, 19, 0).getTime(), now)).toBe('Since 19:00')
    expect(sinceTitle(new Date(2026, 10, 20, 19, 0).getTime(), now)).toBe('Since yesterday, 19:00')
    expect(sinceTitle(new Date(2026, 10, 18, 19, 0).getTime(), now)).toBe('Since 3d ago')
    expect(sinceTitle(new Date(2026, 9, 1, 19, 0).getTime(), now)).toBe('Since 51d ago')
  })
})

describe('avatarCap', () => {
  it('at most 4, then +N', () => {
    expect(avatarCap([1, 2, 3])).toEqual({ shown: [1, 2, 3], extra: 0 })
    expect(avatarCap([1, 2, 3, 4])).toEqual({ shown: [1, 2, 3, 4], extra: 0 })
    expect(avatarCap([1, 2, 3, 4, 5, 6])).toEqual({ shown: [1, 2, 3, 4], extra: 2 })
  })
})

describe('selectHome', () => {
  const stored = (id: string): StoredSession => ({ id, startedAt: 0, mode: 'doubles', games: [] })
  const ongoing: Session = { ...stored('s'), members: [], playerIds: ['a', 'b', 'c', 'd'] }
  it('no sessions ever: first visit', () => {
    expect(selectHome({ current: null, past: [], awaitingPick: false, lineupIds: [] })).toEqual({ kind: 'first-visit' })
  })
  it('no ongoing session: the latest ended one', () => {
    expect(selectHome({ current: null, past: [stored('new'), stored('old')], awaitingPick: false, lineupIds: [] })).toMatchObject({
      kind: 'last',
      session: { id: 'new' },
    })
  })
  it('ongoing: nobody / partly / fully picked, and in progress', () => {
    const at = (lineupIds: string[], awaitingPick = true) => selectHome({ current: ongoing, past: [], awaitingPick, lineupIds }).kind === 'ongoing' && (selectHome({ current: ongoing, past: [], awaitingPick, lineupIds }) as { next: unknown }).next
    expect(at(['', '', '', ''])).toEqual({ kind: 'pick', missing: 4, total: 4 })
    // A player who left the session counts as missing.
    expect(at(['a', '', 'c', 'gone'])).toEqual({ kind: 'pick', missing: 2, total: 4 })
    expect(at(['a', 'b', 'c', 'd'])).toEqual({ kind: 'ready' })
    expect(at(['a', 'b', 'c', 'd'], false)).toEqual({ kind: 'in-progress' })
  })
})

describe('tileAction (Singles / Doubles)', () => {
  const stored: StoredSession = { id: 's', startedAt: 0, mode: 'doubles', games: [] }
  const ongoing: Session = { ...stored, members: [], playerIds: [] }
  it('no ongoing session: a new session straight away', () => {
    expect(tileAction({ kind: 'first-visit' })).toBe('new-session')
    expect(tileAction({ kind: 'last', session: stored })).toBe('new-session')
  })
  it('an ongoing session (any next game): confirm first, never continue it', () => {
    for (const next of [{ kind: 'pick', missing: 4, total: 4 }, { kind: 'ready' }, { kind: 'in-progress' }] as const) {
      expect(tileAction({ kind: 'ongoing', session: ongoing, next })).toBe('confirm-new-session')
    }
  })
})
