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

// Avatar presets (background / text), in the order the Edit player swatch grid shows them.
// Stored on players by id so shades can be tweaked here.
export const AVATAR_COLORS = {
  teal: { bg: '#D5F0EC', fg: '#0F6B5E' },
  mint: { bg: '#D9F5E8', fg: '#0F6A47' },
  green: { bg: '#DDF2DF', fg: '#256B2E' },
  lime: { bg: '#ECF5D0', fg: '#4D6A0B' },
  gold: { bg: '#FFF1C2', fg: '#7A5B00' },
  amber: { bg: '#FCEFD0', fg: '#8A5A00' },
  orange: { bg: '#FDE5D6', fg: '#9A4210' },
  brown: { bg: '#F1E4D6', fg: '#6B4423' },
  rose: { bg: '#FDE2E1', fg: '#A82A26' },
  pink: { bg: '#FBE1EC', fg: '#A3245C' },
  violet: { bg: '#F1E1FB', fg: '#7A2DA0' },
  purple: { bg: '#EAE2FB', fg: '#5B3BA8' },
  indigo: { bg: '#E0E6FB', fg: '#3346A8' },
  sky: { bg: '#DCEFFD', fg: '#0B5C99' },
  cyan: { bg: '#D8EEF7', fg: '#0E6385' },
  slate: { bg: '#E3E8EF', fg: '#334155' },
} as const
export type AvatarColor = keyof typeof AVATAR_COLORS
export const AVATAR_COLOR_NAMES = Object.keys(AVATAR_COLORS) as [AvatarColor, ...AvatarColor[]]

// Auto picks from the original eight, in their original order, so a name hashes to the same
// colour it always did.
const AUTO_COLORS: readonly AvatarColor[] = ['teal', 'purple', 'pink', 'amber', 'green', 'indigo', 'orange', 'cyan']

// How a saved player's colour is chosen: from the name (auto), a preset, or a custom hue.
export const COLOR_MODES = ['auto', 'preset', 'custom'] as const
export type PlayerLook = { mode: 'auto' } | { mode: 'preset'; presetId: AvatarColor } | { mode: 'custom'; hue: number }

// Neutral grey, for snapshots without a colour (e.g. old history of the removed Player 1–4).
export const DEFAULT_AVATAR = { bg: '#EEF1F5', fg: '#3A4458' } as const

// The name-based (auto) colour. Picked when a player is created and saved; picked again only
// when the name changes (case-only changes hash the same).
export function avatarColorFor(name: string): AvatarColor {
  let hash = 0
  for (const ch of name.trim().toLowerCase()) hash = (hash * 31 + ch.codePointAt(0)!) >>> 0
  return AUTO_COLORS[hash % AUTO_COLORS.length]
}

// Custom colours come from a hue only, so initials always stay readable on the background.
export function customColors(hue: number): { bg: string; fg: string } {
  return { bg: `hsl(${hue} 75% 92%)`, fg: `hsl(${hue} 65% 30%)` }
}

type ColorFields = Partial<Pick<Player, 'color' | 'colorMode' | 'presetId' | 'hue'>>

export function avatarColors(player: ColorFields): { bg: string; fg: string } {
  if (player.colorMode === 'custom' && player.hue !== undefined) return customColors(player.hue)
  if (player.colorMode === 'preset' && player.presetId) return AVATAR_COLORS[player.presetId]
  return player.color ? AVATAR_COLORS[player.color] : DEFAULT_AVATAR
}

// A player's stored colour fields as one choice (incomplete data falls back to auto).
export function lookOf(player: ColorFields): PlayerLook {
  if (player.colorMode === 'custom' && player.hue !== undefined) return { mode: 'custom', hue: player.hue }
  if (player.colorMode === 'preset' && player.presetId) return { mode: 'preset', presetId: player.presetId }
  return { mode: 'auto' }
}

// The stored fields for a choice. Fields the mode doesn't use are left out, so picking Auto or
// a preset drops any custom hue.
export function lookFields(look: PlayerLook): Pick<Player, 'colorMode' | 'presetId' | 'hue'> {
  if (look.mode === 'preset') return { colorMode: 'preset', presetId: look.presetId }
  if (look.mode === 'custom') return { colorMode: 'custom', hue: Math.round(look.hue) % 360 }
  return { colorMode: 'auto' }
}

// Hue (0–359) of a #RRGGBB colour, used to start the custom slider near the current colour.
export function hueOf(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const max = Math.max(r, g, b)
  const d = max - Math.min(r, g, b)
  if (d === 0) return 0
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return Math.round(h * 60 + 360) % 360
}
