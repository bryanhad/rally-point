import type { ReactNode } from 'react'
import { useBeatDelay } from './motion'
import { WhistleArt } from './icons'
import { TEAM_COLORS, type TeamColor } from './schema'
import type { ScoreToastState } from './useScoreToast'

// "GAME POINT · Tell Blue to LOCK IN." or "DEUCE · Next TWO IN A ROW wins." A dark pill with its
// art (the whistle, or two clashing rackets) breaking out over its left end, laid over a
// positioned parent (the court card, or the tablet's score area). Purely visual: taps go through
// it, and the announcement is the scoreboard's live region. The entrance/exit/pulse animations
// are in index.css (.gp-*, and .dc-* for the clash), with a plain fade for reduced motion.
export function ScoreToast({
  toast,
  color,
  rackets,
  dim = false,
  className = 'inset-0 items-center',
}: {
  toast: ScoreToastState
  // Game point: the team on it.
  color: TeamColor
  // Deuce: the team colours on the left and right of the screen, for the two rackets.
  rackets: readonly [TeamColor, TeamColor]
  // Darken the parent (the court card) while the toast is up.
  dim?: boolean
  // Where the pill sits in the parent.
  className?: string
}) {
  const deuce = toast.kind === 'deuce'
  return (
    <div
      aria-hidden
      data-leaving={toast.leaving || undefined}
      // No z-index here: the court's game point stroke sits between the dim and the pill.
      className="gp-toast pointer-events-none absolute inset-0 rounded-[inherit]"
    >
      {dim && <div className="gp-dim absolute inset-0 z-[18] rounded-[inherit] bg-[rgba(10,13,20,0.55)]" />}
      <div className={`absolute z-20 flex justify-center ${className}`}>
        {/* Nudged right by half the art's overhang, so art + pill look centred. The deuce pill
            shakes when the rackets clash. */}
        <div className={`relative flex h-16 items-center ${deuce ? 'dc-shake translate-x-3' : 'translate-x-[13px]'}`}>
          <div className="gp-pill absolute inset-0 rounded-full border-2 border-[#F2C94C] bg-[#1E2636]" />
          {deuce ? (
            <ClashingRackets colors={rackets} />
          ) : (
            <svg
              width={76}
              height={69}
              viewBox="-106 -202 328 298"
              className="gp-whistle absolute -top-[22px] -left-[26px] overflow-visible"
            >
              <WhistleArt blowClassName="gp-blow" />
            </svg>
          )}
          {deuce ? (
            <ToastText title="DEUCE" padLeft="pl-[46px]">
              Next <span className="font-black text-[#F2C94C]">TWO IN A ROW</span> wins.
            </ToastText>
          ) : (
            <ToastText title="GAME POINT" padLeft="pl-[42px]">
              Tell{' '}
              <span className="font-black" style={{ color: `color-mix(in srgb, ${TEAM_COLORS[color]} 62%, white)` }}>
                {color.charAt(0).toUpperCase() + color.slice(1)}
              </span>{' '}
              to <span className="font-black text-[#F2C94C]">LOCK IN</span>.
            </ToastText>
          )}
        </div>
      </div>
    </div>
  )
}

function ToastText({ title, padLeft, children }: { title: string; padLeft: string; children: ReactNode }) {
  return (
    <div className={`gp-text relative flex flex-col gap-1 pr-6 ${padLeft}`}>
      <div className="text-lg leading-none font-black tracking-[0.08em] text-white">{title}</div>
      <div className="text-[13px] leading-[1.2] font-bold whitespace-nowrap text-white/72">{children}</div>
    </div>
  )
}

// One racket: a white border (drawn first, thick), then the frame and handle in the team colour
// with an ink outline and white strings. Copied from the mockup.
function Racket({ color, tilt }: { color: string; tilt: number }) {
  const frame = `translate(10 12) rotate(${tilt} 40 46)`
  return (
    <>
      <g transform={frame}>
        <path d="M40 72 L40 44" stroke="#FFFFFF" strokeWidth="17" strokeLinecap="round" />
        <ellipse cx="40" cy="24" rx="14" ry="18" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="12" />
      </g>
      <g transform={frame}>
        <path d="M40 72 L40 44" stroke="#141A26" strokeWidth="9" strokeLinecap="round" />
        <path d="M40 72 L40 44" stroke={color} strokeWidth="4.5" strokeLinecap="round" />
        <ellipse cx="40" cy="24" rx="14" ry="18" fill={color} stroke="#141A26" strokeWidth="4" />
        <path d="M31 16h18M29 24h22M31 32h18M35 9v30M40 7v34M45 9v30" stroke="rgba(255,255,255,0.55)" strokeWidth="1.6" />
      </g>
    </>
  )
}

const SPARK_RAYS = ['M0 -13 L0 -24', 'M10 -8.4 L18.4 -15.4', 'M-10 -8.4 L-18.4 -15.4', 'M13 0 L24 0', 'M-13 0 L-24 0']

// Two crossed rackets in the team colours (left team's on the left) that swing in from upright
// and apart, pivoting on their handle ends, and clash in an X with a gold spark. At rest (and
// with reduced motion) they're crossed with the spark showing.
function ClashingRackets({ colors }: { colors: readonly [TeamColor, TeamColor] }) {
  return (
    <div className="absolute -top-5 -left-6 rotate-[-6deg]">
      <svg width={82} height={82} viewBox="0 0 100 100" aria-hidden className="dc-art overflow-visible">
        <g className="dc-swing-left">
          <Racket color={TEAM_COLORS[colors[0]]} tilt={42} />
        </g>
        <g className="dc-swing-right">
          <Racket color={TEAM_COLORS[colors[1]]} tilt={-42} />
        </g>
        <g transform="translate(50 58)">
          <g className="dc-spark">
            <g stroke="#FFFFFF" strokeWidth="9" strokeLinecap="round">
              {SPARK_RAYS.map((d) => (
                <path key={d} d={d} />
              ))}
            </g>
            <g stroke="#F2C94C" strokeWidth="4.5" strokeLinecap="round">
              {SPARK_RAYS.map((d) => (
                <path key={d} d={d} />
              ))}
            </g>
            <circle r="7" fill="#FFF3CC" stroke="#F2C94C" strokeWidth="3" />
          </g>
        </g>
      </svg>
    </div>
  )
}

// Game point marker in the top-left corner of the team's score button: the gold dot, rippling
// outward on the shared 1.4s beat (with the court's wave and the deuce ring). No text, so it
// never covers the score on short screens (the button's label says "Game point"). The button
// itself never glows: a glowing button reads as "press me" at the tensest moment.
export function GamePointBadge({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const delay = useBeatDelay()
  return (
    <span
      aria-hidden
      className={`beat-dot pointer-events-none absolute rounded-full bg-[#F2C94C] ${
        size === 'lg' ? 'top-7 left-7 size-3.5' : 'top-4 left-4 size-3'
      }`}
      style={{ animationDelay: delay }}
    />
  )
}
