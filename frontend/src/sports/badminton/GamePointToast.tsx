import { WhistleArt } from './icons'
import { TEAM_COLORS, type TeamColor } from './schema'
import type { GamePointToastState } from './useGamePointToast'

// "GAME POINT · Tell Blue to LOCK IN." A dark pill with the whistle breaking out over its left
// end, laid over a positioned parent (the court card, or the tablet's score area). Purely
// visual: taps go through it, and the announcement is the scoreboard's live region. The
// entrance/exit/pulse animations are in index.css (.gp-*), with a plain fade for reduced motion.
export function GamePointToast({
  toast,
  color,
  dim = false,
  className = 'inset-0 items-center',
}: {
  toast: GamePointToastState
  color: TeamColor
  // Darken the parent (the court card) while the toast is up.
  dim?: boolean
  // Where the pill sits in the parent.
  className?: string
}) {
  const name = color.charAt(0).toUpperCase() + color.slice(1)
  return (
    <div
      aria-hidden
      data-leaving={toast.leaving || undefined}
      // No z-index here: the court's team glow sits between the dim and the pill.
      className="gp-toast pointer-events-none absolute inset-0 rounded-[inherit]"
    >
      {dim && <div className="gp-dim absolute inset-0 z-[18] rounded-[inherit] bg-[rgba(10,13,20,0.55)]" />}
      <div className={`absolute z-20 flex justify-center ${className}`}>
        {/* Nudged right by half the whistle's overhang, so whistle + pill look centred. */}
        <div className="relative flex h-16 translate-x-[13px] items-center">
          <div className="gp-pill absolute inset-0 rounded-full border-2 border-[#F2C94C] bg-[#1E2636]" />
          <svg
            width={76}
            height={69}
            viewBox="-106 -202 328 298"
            className="gp-whistle absolute -top-[22px] -left-[26px] overflow-visible"
          >
            <WhistleArt blowClassName="gp-blow" />
          </svg>
          <div className="gp-text relative flex flex-col gap-1 pr-6 pl-[42px]">
            <div className="text-lg leading-none font-black tracking-[0.08em] text-white">GAME POINT</div>
            <div className="text-[13px] leading-[1.2] font-bold whitespace-nowrap text-white/72">
              Tell{' '}
              <span className="font-black" style={{ color: `color-mix(in srgb, ${TEAM_COLORS[color]} 62%, white)` }}>
                {name}
              </span>{' '}
              to <span className="font-black text-[#F2C94C]">LOCK IN</span>.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Game point marker in the top-left corner of the team's score button: the gold dot with its
// halo, straight on the team colour. No text, so it never covers the score on short screens (the
// button's label says "Game point"). The button itself doesn't glow: a glowing button reads as
// "press me" at the tensest moment.
export function GamePointBadge({ size = 'md' }: { size?: 'md' | 'lg' }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute rounded-full bg-[#F2C94C] ${
        size === 'lg'
          ? 'top-7 left-7 size-3.5 shadow-[0_0_0_5px_rgba(242,201,76,0.35)]'
          : 'top-4 left-4 size-2.5 shadow-[0_0_0_4px_rgba(242,201,76,0.35)]'
      }`}
    />
  )
}
