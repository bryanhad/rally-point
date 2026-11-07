import type { Config, Player } from './schema'
import type { CountRow } from './session'

// Helpers shared by the player grids (kept out of the component files for fast refresh).

export function filterPlayers<T extends Pick<Player, 'name'>>(players: readonly T[], query: string): T[] {
  const needle = query.trim().toLowerCase()
  return needle ? players.filter((p) => p.name.toLowerCase().includes(needle)) : [...players]
}

// Tile sizes: the sheets (Change player) use 60px avatars; the modal cards 56px.
export const TILE_LG = 'flex min-h-[116px] w-full flex-col items-center justify-start gap-1.5 rounded-2xl px-1 pt-2.5 pb-2'
export const TILE_SM = 'flex min-h-[108px] w-full flex-col items-center justify-start gap-1.5 rounded-2xl px-0.5 pt-2.5 pb-1.5'

// Fewest players a session needs for each mode.
export const MIN_PLAYERS: Record<Config['mode'], number> = { singles: 2, doubles: 4 }

// Status line colours in the game counts lists: amber, light grey, grey.
export const STATUS_COLOR: Record<CountRow['status'], string> = {
  'not-played': 'text-[#8A5A00]',
  'last-game': 'text-subtle',
  'sat-out': 'text-muted',
}
