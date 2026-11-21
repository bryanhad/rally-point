import { EMPTY_SLOT, screenRow, TEAM_IDS, teamOn, type CourtState } from './game'
import type { CourtView, TeamId } from './schema'
import { viewRow, viewSide } from './view'

// Pick mode: filling the court's slots for the next game. Pure, so the rules are easy to test.

export type SlotRef = { team: TeamId; slot: number }
export type PickState = { slots: Record<TeamId, string[]>; active: SlotRef }
export type PickAction =
  | { type: 'tapSlot'; at: SlotRef }
  | { type: 'clear'; at: SlotRef }
  | { type: 'tapPlayer'; id: string }
  // The fill order changed (the view flipped): start again from its first empty slot.
  | { type: 'reorder' }

// Slot order as drawn on screen, in either view: top-left, bottom-left (the team on the left),
// then top-right, bottom-right. `court` gives the ends and the serve (positions at 0–0).
export function screenOrder(court: CourtState, size: number, view: CourtView): SlotRef[] {
  const placed: CourtState = {
    ...court,
    teams: { a: { score: 0, ids: Array(size).fill(EMPTY_SLOT) }, b: { score: 0, ids: Array(size).fill(EMPTY_SLOT) } },
  }
  const rank = { top: 0, bottom: 1 }
  return (['left', 'right'] as const).flatMap((half) => {
    const team = teamOn(court, viewSide(half, view))
    return Array.from({ length: size }, (_, slot) => ({ team, slot })).sort(
      (x, y) => rank[viewRow(screenRow(placed, team, x.slot), view)] - rank[viewRow(screenRow(placed, team, y.slot), view)],
    )
  })
}

// Empty slots; the first slot in `order` is active.
export function initialPick(size: number, order: SlotRef[]): PickState {
  const empty = () => Array.from({ length: size }, () => EMPTY_SLOT)
  return { slots: { a: empty(), b: empty() }, active: order[0] }
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
    case 'reorder':
      return nextActive(s, order)
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
