// First letter of the first two words: "Kevin Sudarta" -> "KS", "Player 1" -> "P1".
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => [...word][0]?.toUpperCase() ?? '')
    .join('')
}
