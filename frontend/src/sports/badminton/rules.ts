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

// The lowest score deuce starts at: T−1, but at least 1 (with T = 1, 0–0 is just the start).
const deuceFloor = (target: number) => Math.max(target - 1, 1)

// Level at (T−1)–(T−1) or higher: a new deuce.
export function isDeuceTie(scores: Scores, target: number): boolean {
  return scores.a === scores.b && scores.a >= deuceFloor(target)
}

// Deuce has been reached and the game is still being decided: both teams are at T−1 or more
// (once they both get there, neither can drop below), so the indicator stays through every
// game point inside it. Derived from the score, so Undo below (T−1)–(T−1) removes it.
export function inDeuce(scores: Scores, target: number): boolean {
  return Math.min(scores.a, scores.b) >= deuceFloor(target) && gameWinner(scores, target) === null
}

// What a scoring tap for `team` leads to: the game is won, the team has just gone onto game
// point (it can't already have been: a team on game point wins with that rally), the score
// has just tied in deuce, or none of these. Forward taps only: the toasts come from this.
export function afterRally(scores: Scores, team: TeamId, target: number): 'won' | 'game-point' | 'deuce' | null {
  const next = { ...scores, [team]: scores[team] + 1 }
  if (gameWinner(next, target) === team) return 'won'
  if (gamePointTeam(next, target) === team) return 'game-point'
  if (isDeuceTie(next, target)) return 'deuce'
  return null
}
