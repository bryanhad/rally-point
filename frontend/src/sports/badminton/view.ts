import type { SideKey } from './game'
import type { CourtView } from './schema'

// The court is drawn from the referee chair. Facing referee turns it 180°: left ↔ right and
// near ↔ far. A view only: these map where something is drawn, never the game state.

export function viewSide(side: SideKey, view: CourtView): SideKey {
  if (view === 'referee') return side
  return side === 'left' ? 'right' : 'left'
}

export function viewRow(row: 'top' | 'bottom', view: CourtView): 'top' | 'bottom' {
  if (view === 'referee') return row
  return row === 'top' ? 'bottom' : 'top'
}
