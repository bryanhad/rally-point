import type { CSSProperties } from 'react'
import { avatarColors, initials } from './avatarStyle'
import type { Player } from './schema'

type AvatarProps = {
  player: Pick<Player, 'name' | 'color'>
  // Diameter in px.
  size?: number
  className?: string
  // Extra inline styles (e.g. a ring colour that matches the background behind the avatar).
  style?: CSSProperties
}

// Round initials badge in the player's saved colour (grey for the default players).
export function Avatar({ player, size = 38, className = '', style }: AvatarProps) {
  const { bg, fg } = avatarColors(player)
  const text = initials(player.name)
  // Roughly the mockups' ratios (60px -> 20px, 96px -> 34px); two letters run a bit smaller.
  const fontSize = Math.max(9, Math.round(size * (text.length > 1 ? 0.32 : 0.34)))
  return (
    <span
      title={player.name}
      className={`inline-flex shrink-0 items-center justify-center rounded-full leading-none font-extrabold ${className}`}
      style={{ width: size, height: size, fontSize, backgroundColor: bg, color: fg, ...style }}
    >
      {text}
    </span>
  )
}
