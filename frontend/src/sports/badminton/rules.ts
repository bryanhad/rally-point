import type { TeamId } from './schema'

// The game's win rules (house rules, deliberately not the official ones). Pure, so the UI only
// asks and the rules are easy to check:
// - A game is won with at least T points and a lead of 2 or more (21–19, 22–20, 40–38).
// - Deuce starts at (T−1)–(T−1); from a tie, two points in a row win. No cap.
// - Game point: winning the next rally would win the game.

export type Scores = Record<TeamId, number>

const other = (team: TeamId): TeamId => (team === 'a' ? 'b' : 'a')

export function hasWon(score: number, otherScore: number, target: number): boolean {
  return score >= target && score - otherScore >= 2
}

// One rally from winning, and not already won. Same as score ≥ T−1 with a lead of at least 1.
export function isOnGamePoint(score: number, otherScore: number, target: number): boolean {
  return !hasWon(score, otherScore, target) && hasWon(score + 1, otherScore, target)
}

// The team that has won, or null while the game is open.
export function gameWinner(scores: Scores, target: number): TeamId | null {
  return (['a', 'b'] as const).find((t) => hasWon(scores[t], scores[other(t)], target)) ?? null
}

// The team on game point, or null. Never both: game point needs a lead.
export function gamePointTeam(scores: Scores, target: number): TeamId | null {
  return (['a', 'b'] as const).find((t) => isOnGamePoint(scores[t], scores[other(t)], target)) ?? null
}

// What a scoring tap for `team` leads to: the game is won, the team has just gone onto game
// point (it can't already have been: a team on game point wins with that rally), or neither.
export function afterRally(scores: Scores, team: TeamId, target: number): 'won' | 'game-point' | null {
  const next = { ...scores, [team]: scores[team] + 1 }
  if (gameWinner(next, target) === team) return 'won'
  if (gamePointTeam(next, target) === team) return 'game-point'
  return null
}
