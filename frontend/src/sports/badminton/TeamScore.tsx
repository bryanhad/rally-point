import { TEAM_COLORS, TEAM_TINTS, type TeamColor } from './schema'

// Team scores as small versions of the big score buttons: the team's solid colour with white
// digits, so colour = team everywhere. Used on the Home in-progress card, Game point, Game won
// and the Rally snapshot. (Flip digits are only for targets and rules now.)

type Size = 'sm' | 'md' | 'lg'
// Height and font size (px) per size; radius, min width and side padding follow the height.
const SIZES: Record<Size, { h: number; text: number }> = {
  sm: { h: 34, text: 18 },
  md: { h: 50, text: 30 },
  lg: { h: 56, text: 34 },
}

export type TeamScore = {
  color: TeamColor
  score: number
  // For the screen reader label, e.g. "Team Blue".
  name: string
  // 'loser': the losing side of a final result (team tint, dark team text).
  tone?: 'solid' | 'loser'
  // Gold ring with a white gap (the Rally snapshot's point winner).
  ring?: boolean
}

export function TeamScoreTile({ color, score, tone = 'solid', ring = false, size }: TeamScore & { size: Size }) {
  const { h, text } = SIZES[size]
  const loser = tone === 'loser'
  return (
    <span
      className="flex shrink-0 items-center justify-center leading-none font-extrabold whitespace-nowrap tabular-nums"
      style={{
        height: h,
        minWidth: h * 1.12,
        paddingInline: h * 0.22,
        borderRadius: h * 0.3,
        fontSize: text,
        backgroundColor: loser ? TEAM_TINTS[color].bg : TEAM_COLORS[color],
        color: loser ? TEAM_TINTS[color].fg : '#FFFFFF',
        boxShadow: ring ? '0 0 0 2px #FFFFFF, 0 0 0 5px #F2C94C' : undefined,
      }}
    >
      {score}
    </span>
  )
}

// Two tiles with an en dash between them, read as one label ("Team Blue 11, Team Red 0").
export function TeamScorePair({
  scores,
  size,
  label,
  className = '',
}: {
  scores: [TeamScore, TeamScore]
  size: Size
  // Overrides the default label (e.g. for a draw).
  label?: string
  className?: string
}) {
  return (
    <span
      role="img"
      aria-label={label ?? scores.map((s) => `${s.name} ${s.score}`).join(', ')}
      className={`flex shrink-0 items-center ${size === 'sm' ? 'gap-1.5' : 'gap-3'} ${className}`}
    >
      <TeamScoreTile {...scores[0]} size={size} />
      <span aria-hidden className={`font-extrabold text-line-dashed ${size === 'sm' ? 'text-sm' : 'text-2xl'}`}>
        –
      </span>
      <TeamScoreTile {...scores[1]} size={size} />
    </span>
  )
}
