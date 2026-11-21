// Serve indicator: shuttle with a white outline, translucent skirt and orange cork.
export function Shuttle({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 26" width="20" height="26" className={className} aria-label="Serving" role="img">
      <g fill="none" stroke="#FFFFFF" strokeWidth="1.6" strokeLinejoin="round">
        <path d="M3 2h14l-3 15H6z" fill="rgba(255,255,255,0.25)" />
        <path d="M8 2l.8 15" />
        <path d="M12 2l-.8 15" />
        <circle cx="10" cy="20.5" r="3.5" fill="var(--color-cork)" />
      </g>
    </svg>
  )
}

// Umpire's chair: side posts, backrest bar, grey seat with the umpire's head, footrest.
export function RefereeChair({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 26" width="40" height="26" className={className} aria-hidden>
      <rect x="1" y="5" width="7" height="18" rx="3" fill="var(--color-referee)" />
      <rect x="32" y="5" width="7" height="18" rx="3" fill="var(--color-referee)" />
      <rect x="7" y="1" width="26" height="5" rx="2" fill="var(--color-referee)" />
      <rect x="7" y="6" width="26" height="17" rx="3" fill="var(--color-referee-seat)" />
      <circle cx="20" cy="14.5" r="5" fill="#FFFFFF" stroke="var(--color-referee)" strokeWidth="2" />
      <rect x="10" y="22" width="20" height="3" rx="1.5" fill="var(--color-referee)" />
    </svg>
  )
}

// Medal: the one "awarded" symbol (Game point, Game won, Match history). Gold disc with a light
// inner ring and two ribbon tails. On a team-colour header (`onColor`) the left tail is white and
// the right one a light tint of the team colour; on white the tails are the team colour and a
// lighter shade of it, so they don't disappear. Decorative.
export function Medal({
  teamColor,
  onColor = true,
  className = '',
}: {
  teamColor: string
  onColor?: boolean
  className?: string
}) {
  return (
    <svg viewBox="0 0 20 24" width="37" height="44" className={className} aria-hidden>
      <path d="M4 1h4.5l3 8H7z" style={{ fill: onColor ? '#FFFFFF' : teamColor }} />
      <path
        d="M16 1h-4.5l-3 8H13z"
        style={{ fill: `color-mix(in srgb, ${teamColor} ${onColor ? 25 : 55}%, white)` }}
      />
      <circle cx="10" cy="15.5" r="7.5" fill="var(--color-crown)" stroke="var(--color-crown-edge)" strokeWidth="1.2" />
      <circle cx="10" cy="15.5" r="4" fill="none" stroke="#FFF3CC" strokeWidth="1.4" />
    </svg>
  )
}

// Singles: one racket, drawn exactly like each of the two in `Rackets` so the pair reads as
// "one racket vs two". Uses currentColor.
export function Racket({ className = '', strokeWidth = 2 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="5 0 18 24" width="15" height="20" className={className} aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round">
        <ellipse cx="13" cy="8" rx="4" ry="5.5" transform="rotate(-20 13 8)" />
        <path d="M15 13l2 9" />
      </g>
    </svg>
  )
}

// Doubles: two rackets side by side. Uses currentColor.
export function Rackets({ className = '', strokeWidth = 2 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 28 24" width="22" height="20" className={className} aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round">
        <ellipse cx="8" cy="8" rx="4" ry="5.5" transform="rotate(-20 8 8)" />
        <path d="M10 13l2 9" />
        <ellipse cx="19" cy="8" rx="4" ry="5.5" transform="rotate(-20 19 8)" />
        <path d="M21 13l2 9" />
      </g>
    </svg>
  )
}

// Streak badge: orange flame with the number of games in a row.
export function Flame({ count, className = '' }: { count: number; className?: string }) {
  return (
    <span role="img" aria-label={`${count} ${count === 1 ? 'game' : 'games'} in a row`} className={`block h-[26px] w-[22px] ${className}`}>
      <svg width="22" height="26" viewBox="0 0 22 26" aria-hidden>
        <path
          d="M11 1.2C12.9 5.6 20 8.6 20 16.4a9 9 0 0 1-18 0c0-4 2.2-6.8 4.5-8.5 0 1.5.7 2.3 2.1 2.6C8.3 7.8 9.2 4.4 11 1.2z"
          fill="var(--color-cork)"
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <text x="11" y="21" textAnchor="middle" fontFamily="inherit" fontSize="9.5" fontWeight="800" fill="#FFFFFF">
          {count}
        </text>
      </svg>
    </span>
  )
}

// Small gold trophy: "won last game".
export function Trophy({ size = 13, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#C99A1E" className={className} aria-hidden>
      <path d="M6 3h12v6a6 6 0 0 1-12 0z" />
      <path d="M6 5H3a3 3 0 0 0 3 5" fill="none" stroke="#C99A1E" strokeWidth="2.4" />
      <path d="M18 5h3a3 3 0 0 1-3 5" fill="none" stroke="#C99A1E" strokeWidth="2.4" />
      <rect x="10.5" y="14" width="3" height="4" />
      <rect x="7" y="18.5" width="10" height="3" rx="1" />
    </svg>
  )
}

// The referee's whistle as a yellow "sticker" (thick white outer border, ink outline), tilted
// −30° with three blow lines off the mouthpiece. Drawn around the chamber's centre-ish origin;
// callers place it with their own <svg> viewBox or transform. `blowClassName` animates the lines.
const WHISTLE_BODY =
  'M0,-60 L182,-60 Q190,-60 190,-52 L190,-22 Q190,-14 182,-14 L58.3,-14 A60,60 0 1 1 0,-60 Z'
const BLOW_LINES = ['M228,-41 L264,-48', 'M214,-72 L225,-89', 'M216,-6 L230,0']

export function WhistleArt({ blowClassName = '' }: { blowClassName?: string }) {
  return (
    <g transform="rotate(-30)">
      {/* White sticker border: the body and the ring, stroked wide. */}
      <path d={WHISTLE_BODY} fill="#FFFFFF" stroke="#FFFFFF" strokeWidth={24} strokeLinejoin="round" />
      <circle cx={-58} cy={-44} r={15} fill="none" stroke="#FFFFFF" strokeWidth={23} />
      <path d={WHISTLE_BODY} fill="#F2C94C" stroke="#141A26" strokeWidth={6} strokeLinejoin="round" />
      <rect x={70} y={-60} width={34} height={13} rx={3} fill="#B8860B" />
      <circle cx={-4} cy={8} r={22} fill="none" stroke="#B8860B" strokeWidth={3} />
      <circle cx={-58} cy={-44} r={15} fill="none" stroke="#141A26" strokeWidth={5} />
      <g className={blowClassName}>
        <g stroke="#FFFFFF" strokeWidth={19} strokeLinecap="round">
          {BLOW_LINES.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
        <g stroke="#F2C94C" strokeWidth={7} strokeLinecap="round">
          {BLOW_LINES.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
      </g>
    </g>
  )
}
