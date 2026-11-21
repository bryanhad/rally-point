import type { ReactNode } from 'react'

// Shared line icons (from the ui-design mockups). All use currentColor.
type IconProps = { size?: number; className?: string; strokeWidth?: number }

function Svg({ size = 20, className, strokeWidth = 2, children }: IconProps & { strokeWidth?: number; children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  )
}

export const SearchIcon = (p: IconProps) => (
  <Svg size={18} strokeWidth={2.2} {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4 4" />
  </Svg>
)

export const BackIcon = (p: IconProps) => (
  <Svg size={22} strokeWidth={2.2} {...p}>
    <path d="M15 18l-6-6 6-6" />
  </Svg>
)

export const ChevronRightIcon = (p: IconProps) => (
  <Svg size={20} strokeWidth={2.2} {...p}>
    <path d="M9 18l6-6-6-6" />
  </Svg>
)

export const ArrowRightIcon = (p: IconProps) => (
  <Svg size={22} strokeWidth={2.4} {...p}>
    <path d="M5 12h14" />
    <path d="M13 6l6 6-6 6" />
  </Svg>
)

export const GearIcon = (p: IconProps) => (
  <Svg size={24} {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </Svg>
)

export const CloseIcon = (p: IconProps) => (
  <Svg size={18} strokeWidth={2.4} {...p}>
    <path d="M6 6l12 12" />
    <path d="M18 6L6 18" />
  </Svg>
)

export const UndoIcon = (p: IconProps) => (
  <Svg size={18} strokeWidth={2.2} {...p}>
    <path d="M9 14L4 9l5-5" />
    <path d="M4 9h11a5 5 0 0 1 0 10h-3" />
  </Svg>
)

export const RedoIcon = (p: IconProps) => (
  <Svg size={18} strokeWidth={2.2} {...p}>
    <path d="M15 14l5-5-5-5" />
    <path d="M20 9H9a5 5 0 0 0 0 10h3" />
  </Svg>
)

export const ResetIcon = (p: IconProps) => (
  <Svg size={19} strokeWidth={2.2} {...p}>
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 3v5h5" />
  </Svg>
)

export const FlagIcon = (p: IconProps) => (
  <Svg size={16} strokeWidth={2.2} {...p}>
    <path d="M5 21V4" />
    <path d="M5 4h12l-2 4 2 4H5" />
  </Svg>
)

export const TrophyIcon = (p: IconProps) => (
  <Svg size={18} {...p}>
    <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
    <path d="M7 6H4a3 3 0 0 0 3 4" />
    <path d="M17 6h3a3 3 0 0 1-3 4" />
    <path d="M12 14v3" />
    <path d="M9 20h6" />
  </Svg>
)

export const TrashIcon = ({ withLines = false, ...p }: IconProps & { withLines?: boolean }) => (
  <Svg size={16} strokeWidth={2.2} {...p}>
    <path d="M4 7h16" />
    <path d="M9 7V4h6v3" />
    <path d="M6 7l1 13h10l1-13" />
    {withLines && (
      <>
        <path d="M10 11v5" />
        <path d="M14 11v5" />
      </>
    )}
  </Svg>
)

export const EditIcon = (p: IconProps) => (
  <Svg size={18} {...p}>
    <path d="M4 20h4L19 9l-4-4L4 16z" />
    <path d="M13 7l4 4" />
  </Svg>
)

// Four-point sparkle: filled for the Auto swatch badge, outlined for hint text.
export const SparkleIcon = ({ filled = false, ...p }: IconProps & { filled?: boolean }) =>
  filled ? (
    <svg width={p.size ?? 9} height={p.size ?? 9} viewBox="0 0 24 24" fill="currentColor" className={p.className} aria-hidden>
      <path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z" />
    </svg>
  ) : (
    <Svg size={14} {...p}>
      <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" />
    </Svg>
  )

export const PlusIcon = (p: IconProps) => (
  <Svg size={20} strokeWidth={2.4} {...p}>
    <path d="M5 12h14" />
    <path d="M12 5v14" />
  </Svg>
)

export const MinusIcon = (p: IconProps) => (
  <Svg size={20} strokeWidth={2.4} {...p}>
    <path d="M5 12h14" />
  </Svg>
)

export const SwapIcon = (p: IconProps) => (
  <Svg size={16} strokeWidth={2.2} {...p}>
    <path d="M4 8h14" />
    <path d="M15 5l3 3-3 3" />
    <path d="M20 16H6" />
    <path d="M9 13l-3 3 3 3" />
  </Svg>
)

// Swap arrows of the pre-rally court controls (top arrow points left, bottom one right).
export const SwapArrowsIcon = (p: IconProps & { strokeWidth?: number }) => (
  <Svg size={18} strokeWidth={2.4} {...p}>
    <path d="M4 8h16" />
    <path d="M8 4L4 8l4 4" />
    <path d="M20 16H4" />
    <path d="M16 12l4 4-4 4" />
  </Svg>
)

export const CheckIcon = (p: IconProps & { strokeWidth?: number }) => (
  <Svg size={12} strokeWidth={3.2} {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
)

export const AlertIcon = (p: IconProps) => (
  <Svg size={26} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5.5" />
    <path d="M12 16.5h.01" />
  </Svg>
)

// Two people: managing the saved player list.
export const UsersIcon = (p: IconProps) => (
  <Svg size={17} {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M3 20a6 6 0 0 1 12 0" />
    <circle cx="17" cy="9" r="2.5" />
    <path d="M15.5 14.5A5 5 0 0 1 21 19" />
  </Svg>
)

// A play triangle (start / resume a game).
export const PlayIcon = (p: IconProps) => (
  <Svg size={18} strokeWidth={2.2} {...p}>
    <path d="M7 4.5v15l12-7.5z" fill="currentColor" />
  </Svg>
)

// Person with a plus: adding or removing people in a session.
export const UserPlusIcon = (p: IconProps) => (
  <Svg size={16} strokeWidth={2.2} {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M3 20a6 6 0 0 1 12 0" />
    <path d="M19 8v6" />
    <path d="M16 11h6" />
  </Svg>
)

// Three bars: game counts.

export const CalendarIcon = (p: IconProps) => (
  <Svg size={30} {...p}>
    <rect x="4" y="5" width="16" height="15" rx="2" />
    <path d="M4 10h16" />
    <path d="M9 3v4" />
    <path d="M15 3v4" />
  </Svg>
)

export const ClockIcon = (p: IconProps) => (
  <Svg size={18} strokeWidth={2.2} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Svg>
)

export const LockIcon = (p: IconProps) => (
  <Svg size={10} strokeWidth={2.6} {...p}>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </Svg>
)

export const EyeIcon = (p: IconProps) => (
  <Svg strokeWidth={2.2} {...p}>
    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
)

// A circular arrow: "flip" / "turn around".
export const RotateIcon = (p: IconProps) => (
  <Svg size={15} strokeWidth={2.4} {...p}>
    <path d="M20 12a8 8 0 1 1-2.4-5.7" />
    <path d="M20 4v5h-5" />
  </Svg>
)
