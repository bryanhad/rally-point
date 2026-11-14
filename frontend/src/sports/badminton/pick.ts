import { EMPTY_SLOT, TEAM_IDS } from './game'
import type { TeamId } from './schema'

// Pick mode: filling the court's slots for the next game. Pure, so the rules are easy to test.

export type SlotRef = { team: TeamId; slot: number }
export type PickState = { slots: Record<TeamId, string[]>; active: SlotRef }
export type PickAction =
  | { type: 'tapSlot'; at: SlotRef }
  | { type: 'clear'; at: SlotRef }
  | { type: 'tapPlayer'; id: string }

// Slot order for "the next empty slot": the first team's slots, then the other team's.
export function slotOrder(size: number, first: TeamId): SlotRef[] {
  const teams = first === TEAM_IDS[0] ? TEAM_IDS : [...TEAM_IDS].reverse()
  return teams.flatMap((team) => Array.from({ length: size }, (_, slot) => ({ team, slot })))
}

export function initialPick(size: number, first: TeamId): PickState {
  const empty = () => Array.from({ length: size }, () => EMPTY_SLOT)
  return { slots: { a: empty(), b: empty() }, active: slotOrder(size, first)[0] }
}

export const isFull = (s: PickState) => TEAM_IDS.every((t) => s.slots[t].every((id) => id !== EMPTY_SLOT))
export const pickedCount = (s: PickState) => TEAM_IDS.reduce((n, t) => n + s.slots[t].filter((id) => id !== EMPTY_SLOT).length, 0)

export function findPlayer(s: PickState, id: string): SlotRef | null {
  for (const team of TEAM_IDS) {
    const slot = s.slots[team].indexOf(id)
    if (slot !== -1) return { team, slot }
  }
  return null
}

// After a pick, the active slot moves to the first empty slot (in `order`); if none, it stays.
function nextActive(s: PickState, order: SlotRef[]): PickState {
  const empty = order.find(({ team, slot }) => s.slots[team][slot] === EMPTY_SLOT)
  return empty ? { ...s, active: empty } : s
}

export function pickReducer(s: PickState, action: PickAction, order: SlotRef[]): PickState {
  const slots = { a: [...s.slots.a], b: [...s.slots.b] }
  switch (action.type) {
    // Rule 2: any slot, empty or filled, either team, becomes the active one.
    case 'tapSlot':
      return { ...s, active: action.at }
    // Rule 6: × empties a slot, which becomes active.
    case 'clear':
      slots[action.at.team][action.at.slot] = EMPTY_SLOT
      return { slots, active: action.at }
    case 'tapPlayer': {
      // Rule 4: a player who's already picked (in any slot) does nothing. To change a pick,
      // tap its slot then another player, or × it. (Swapping from the list confused people.)
      if (findPlayer(s, action.id)) return s
      // Rule 3: an unpicked player fills (or replaces) the active slot.
      const { team, slot } = s.active
      slots[team][slot] = action.id
      // Rule 7.
      return nextActive({ slots, active: s.active }, order)
    }
  }
}
