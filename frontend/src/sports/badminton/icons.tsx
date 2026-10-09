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

// Gold crown worn by winners.
export function Crown({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 22 18" width="22" height="18" className={className} aria-label="Winner" role="img">
      <path
        d="M1 5l5 4 5-8 5 8 5-4-2 11H3z"
        fill="var(--color-crown)"
        stroke="var(--color-crown-edge)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Singles: one racket. Uses currentColor.
export function Racket({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" className={className} aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <ellipse cx="9" cy="8" rx="4" ry="5.5" transform="rotate(-30 9 8)" />
        <path d="M12 12l7 8" />
      </g>
    </svg>
  )
}

// Doubles: two rackets side by side. Uses currentColor.
export function Rackets({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 24" width="22" height="20" className={className} aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <ellipse cx="8" cy="8" rx="4" ry="5.5" transform="rotate(-20 8 8)" />
        <path d="M10 13l2 9" />
        <ellipse cx="19" cy="8" rx="4" ry="5.5" transform="rotate(-20 19 8)" />
        <path d="M21 13l2 9" />
      </g>
    </svg>
  )
}

// Swap player sides: a person with an arrow. Uses currentColor.
export function SidesIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" className={className} aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="6" r="3" />
        <path d="M3 17a5 5 0 0 1 10 0" />
        <path d="M15 14h6" />
        <path d="M19 11l2 3-2 3" />
        <path d="M21 20h-6" />
      </g>
    </svg>
  )
}

// Swap server side: a shuttle with an arrow. Uses currentColor; the cork is orange.
export function ServerIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" className={className} aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 3h8l-1.5 9h-5z" />
        <path d="M8 3l.5 9" />
        <path d="M10 3l-.5 9" />
        <circle cx="9" cy="15" r="2.5" fill="var(--color-cork)" stroke="var(--color-cork)" />
        <path d="M15 15h6" />
        <path d="M19 12l2 3-2 3" />
      </g>
    </svg>
  )
}

// Sport mark for the home page: a racket and a shuttle, white line style.
export function BadmintonMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" width="40" height="40" className={className} aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="16" cy="16" rx="9" ry="11" transform="rotate(-35 16 16)" />
        <path d="M22 24l14 14" />
        <path d="M34 6l8 8-5 3-6-6z" />
      </g>
    </svg>
  )
}

