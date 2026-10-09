import type { ReactNode } from 'react'

// Shared line icons (from the ui-design mockups). All use currentColor.
type IconProps = { size?: number; className?: string }

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

export const AlertIcon = (p: IconProps) => (
  <Svg size={26} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5.5" />
    <path d="M12 16.5h.01" />
  </Svg>
)
