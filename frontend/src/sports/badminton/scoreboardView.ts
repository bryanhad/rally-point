// The data and actions a scoreboard layout (phone or tablet) receives from the Scoreboard page.
import type { CourtState, RallyStep } from './game'
import { TEAM_COLORS, type Config, type HistoryEntry, type Player, type Session, type TeamColor, type TeamId } from './schema'
import type { GamePointToastState } from './useGamePointToast'

export type NumberedRally = { step: RallyStep; number: number }

// Everything a scoreboard layout shows, and what its controls do. Scoreboard owns the state and
// the sheets/dialogs; the layouts (phone, tablet) only render this.
export type ScoreboardView = {
  court: CourtState
  byId: Map<string, Player>
  config: Config
  session: Session | null
  // All saved players (for the Session tile).
  players: Player[]
  started: boolean
  // Between games in a session: the court waits for this game's players.
  pickPending: boolean
  // No session, or picking: game controls are off.
  blocked: boolean
  emptySpot: boolean
  reachedTotal: boolean
  // The team on game point (from the score, so Undo/Redo/reload restore it silently), and the
  // toast while a scoring tap's announcement is up.
  gamePoint: { team: TeamId; toast: GamePointToastState | null } | null
  // Tablet: the Court preview is open (the toast and dim move onto its court).
  courtOpen: boolean
  canUndo: boolean
  canRedo: boolean
  // Last game's lineup for "Same players", or null when it can't be reused.
  sameLineup: Player[] | null
  gameNumber: number | null
  // The session's last finished game, from match history (null for the first game, or once
  // history is cleared).
  lastResult: { gameNumber: number; entry: HistoryEntry } | null
  // Rallies newest first.
  rallies: NumberedRally[]
  onRally: (team: TeamId) => void
  onUndo: () => void
  onRedo: () => void
  onReset: () => void
  onEnd: () => void
  onMode: (mode: Config['mode']) => void
  onSides: () => void
  onServer: () => void
  onPick: (team: TeamId, slot: number) => void
  // Only before the first rally.
  onSwapPartners?: (team: TeamId) => void
  onOpenSession: () => void
  onOpenRules: () => void
  // Tablet: the Court preview.
  onOpenCourt: () => void
  onOpenRally: (number: number) => void
  onOpenHistory: () => void
  onNewSession: () => void
  onPickPlayers: () => void
  onSamePlayers: () => void
}

export const colorName = (config: Config, team: TeamId) => {
  const name = config.teamColors[team]
  return name.charAt(0).toUpperCase() + name.slice(1)
}

export const teamName = (color: TeamColor) => `Team ${color.charAt(0).toUpperCase()}${color.slice(1)}`

// Palette name of a history snapshot's hex colour, or null (missing, or the palette changed).
export function colorFromHex(hex: string | undefined): TeamColor | null {
  return (Object.keys(TEAM_COLORS) as TeamColor[]).find((c) => TEAM_COLORS[c].toLowerCase() === hex?.toLowerCase()) ?? null
}

// How the last game ended, in words for the Next up card: the winning team's colour name (looked
// up from the hex saved with the entry), or their names when no palette colour matches, and the
// score with the winner's points first.
export function describeResult(entry: HistoryEntry) {
  if (entry.winner === 'draw') return { draw: true as const, score: `${entry.left.score}–${entry.right.score}` }
  const won = entry[entry.winner]
  const lost = entry[entry.winner === 'left' ? 'right' : 'left']
  const color = colorFromHex(won.color)
  const team = color ? teamName(color) : won.players.map((p) => p.name).join(' & ')
  return { draw: false as const, team, color: won.color, score: `${won.score}–${lost.score}` }
}
