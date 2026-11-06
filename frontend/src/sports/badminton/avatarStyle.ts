import type { Player } from './schema'

// First letter of up to the first two words: "kevin sanjaya" -> "KS", "Player 1" -> "P1".
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => [...word][0]?.toUpperCase() ?? '')
    .join('')
}

// Avatar palette (background / text). Stored on players by name so shades can be tweaked here.
export const AVATAR_COLORS = {
  teal: { bg: '#D5F0EC', fg: '#0F6B5E' },
  purple: { bg: '#EAE2FB', fg: '#5B3BA8' },
  pink: { bg: '#FBE1EC', fg: '#A3245C' },
  amber: { bg: '#FCEFD0', fg: '#8A5A00' },
  green: { bg: '#DDF2DF', fg: '#256B2E' },
  indigo: { bg: '#E0E6FB', fg: '#3346A8' },
  orange: { bg: '#FDE5D6', fg: '#9A4210' },
  cyan: { bg: '#D8EEF7', fg: '#0E6385' },
} as const
export type AvatarColor = keyof typeof AVATAR_COLORS
export const AVATAR_COLOR_NAMES = Object.keys(AVATAR_COLORS) as [AvatarColor, ...AvatarColor[]]

// Default players (P1–P4) are always neutral grey.
export const DEFAULT_AVATAR = { bg: '#EEF1F5', fg: '#3A4458' } as const

// Colour a new player gets. Only used when the player is created (or, for players saved
// before colours existed, once on load); after that the stored colour wins, so renames keep it.
export function avatarColorFor(name: string): AvatarColor {
  let hash = 0
  for (const ch of name.trim().toLowerCase()) hash = (hash * 31 + ch.codePointAt(0)!) >>> 0
  return AVATAR_COLOR_NAMES[hash % AVATAR_COLOR_NAMES.length]
}

export function avatarColors(player: Pick<Player, 'color'>): { bg: string; fg: string } {
  return player.color ? AVATAR_COLORS[player.color] : DEFAULT_AVATAR
}
