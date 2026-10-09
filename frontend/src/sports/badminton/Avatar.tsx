import { initials } from './initials'

type AvatarProps = {
  name: string
  // Diameter in px (mockups use 32–38).
  size?: number
  // accent: soft blue (saved players); plain: white on a tinted row (default players);
  // danger: white with red initials (row pending delete).
  tone?: 'accent' | 'plain' | 'danger'
  className?: string
}

const TONES = {
  accent: 'bg-accent-soft text-band-ink',
  plain: 'bg-white text-ink-2',
  danger: 'bg-white text-danger',
}

// Round initials badge for a player.
export function Avatar({ name, size = 38, tone = 'accent', className = '' }: AvatarProps) {
  return (
    <span
      title={name}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-extrabold ${TONES[tone]} ${className}`}
      style={{ width: size, height: size, fontSize: size >= 36 ? 13 : 11 }}
    >
      {initials(name)}
    </span>
  )
}
