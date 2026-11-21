import type { SideKey } from './game'
import { useBeatDelay } from './motion'

// Deuce: a 3px gradient ring hugging the court card, from the left team's colour through gold to
// the right team's. A copy ripples outward the same 8px on every side ("lub-dub": two ripples
// 0.22s apart, then a rest). Laid behind the card, inside an isolated wrapper. Decorative only.
export function DeuceRing({ left, right, radius }: { left: string; right: string; radius: number }) {
  const delay = useBeatDelay()
  const style = {
    borderRadius: radius + 3,
    background: `linear-gradient(90deg, ${left}, #F2C94C 50%, ${right}) border-box`,
    ['--beat-r' as string]: `${radius + 3}px`,
  }
  return (
    <>
      <div aria-hidden className="deuce-ring" style={style} />
      <div aria-hidden className="deuce-ring deuce-ripple" style={{ ...style, animationDelay: delay }} />
      <div
        aria-hidden
        className="deuce-ring deuce-ripple"
        style={{ ...style, animationDelay: `calc(${delay} + 220ms)` }}
      />
    </>
  )
}

// Game point: the team's half of the court card gets a steady 3px inner stroke in its colour,
// and a wave travels inward from it on the first heartbeat. Above the toast's dim, below its
// pill. Follows the team when ends swap (the caller passes the screen side).
export function GamePointHalf({ side, color, radius }: { side: SideKey; color: string; radius: number }) {
  const delay = useBeatDelay()
  const borderRadius = side === 'left' ? `${radius}px 0 0 ${radius}px` : `0 ${radius}px ${radius}px 0`
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-y-0 z-[19] w-1/2 ${side === 'left' ? 'left-0' : 'right-0'}`}
      style={{ borderRadius, boxShadow: `inset 0 0 0 3px ${color}` }}
    >
      <i
        className="gp-wave absolute inset-0"
        style={{ borderRadius, borderColor: `color-mix(in srgb, ${color} 90%, transparent)`, animationDelay: delay }}
      />
    </div>
  )
}
