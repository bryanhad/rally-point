import type { ReactNode } from 'react'

type HeaderBandProps = {
  title: ReactNode
  // 44px controls on either side of the title (back link, settings, or an empty spacer).
  left?: ReactNode
  right?: ReactNode
  // Content of the court-line frame under the title row.
  children?: ReactNode
  className?: string
  // 'left' for a brand title with no back button (home); 'center' between two controls.
  align?: 'center' | 'left'
  // Space under the frame: 12px (scoreboard), 14px (config) or 20px (home, where a card overlaps it).
  bottom?: 'sm' | 'md' | 'lg'
  // false: children sit straight on the band (e.g. `BandTile`s) instead of inside the court-line frame.
  framed?: boolean
  // 'tight' (scoreboard): 8px top padding and a 44px title row with 4px under it, so a control in
  // the title (the match type switch) sits 8px above the tiles. Default: 4px / 48px.
  spacing?: 'default' | 'tight'
}

const BOTTOM = { sm: 'pb-3', md: 'pb-3.5', lg: 'pb-5' }

// Blue header band with rounded bottom corners and a court-line frame. Use `FrameCell` with
// `divider` to split the frame with the same 1.5px lines.
export function HeaderBand({
  title,
  left,
  right,
  children,
  className = '',
  align = 'center',
  bottom = 'sm',
  framed = true,
  spacing = 'default',
}: HeaderBandProps) {
  const tight = spacing === 'tight'
  const row = tight ? 'mb-1 h-11' : 'h-12'
  return (
    <header
      className={`shrink-0 rounded-b-band bg-band px-2 text-white ${BOTTOM[bottom]} ${className}`}
      style={{ paddingTop: `max(${tight ? 8 : 4}px, env(safe-area-inset-top))` }}
    >
      {align === 'left' ? (
        <div className={`flex items-center justify-between pl-2 ${row}`}>
          <div className="truncate text-[13px] font-extrabold tracking-[0.32em]">{title}</div>
          <div>{right}</div>
        </div>
      ) : (
        <div className={`grid grid-cols-[44px_1fr_44px] items-center ${row}`}>
          <div>{left}</div>
          {typeof title === 'string' ? (
            <div className="truncate text-center text-[13px] font-extrabold tracking-[0.32em]">{title}</div>
          ) : (
            <div className="flex min-w-0 justify-center">{title}</div>
          )}
          <div>{right}</div>
        </div>
      )}
      {children &&
        (framed ? (
          <div className="mx-2 flex items-stretch rounded-[14px] border-[1.5px] border-[var(--band-line)]">
            {children}
          </div>
        ) : (
          <div className="mx-2 flex items-stretch gap-2">{children}</div>
        ))}
    </header>
  )
}

type BandTileProps = {
  onClick: () => void
  'aria-label': string
  // Shown in the white circle on the right (e.g. a pencil or a chevron).
  icon: ReactNode
  // Extra classes for the icon circle (e.g. hiding it on narrow screens).
  iconClassName?: string
  className?: string
  children: ReactNode
}

// Flat tappable tile inside an unframed band: lighter blue, white icon circle on the right,
// darkens and shrinks slightly while pressed. Pass the gap before the icon in `className`.
export function BandTile({ onClick, icon, iconClassName = '', className = '', children, ...rest }: BandTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={rest['aria-label']}
      className={`flex h-16 min-w-0 items-center rounded-[14px] bg-band-tile px-2 text-left text-white transition-transform duration-100 active:scale-[0.97] active:bg-band-tile-pressed motion-reduce:transition-none ${className}`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5">{children}</div>
      <span className={`flex size-[26px] shrink-0 items-center justify-center rounded-full bg-white text-band ${iconClassName}`}>
        {icon}
      </span>
    </button>
  )
}

// A cell inside the band frame; `divider` draws the frame line on its left edge.
export function FrameCell({
  divider = false,
  className = '',
  children,
}: {
  divider?: boolean
  className?: string
  children?: ReactNode
}) {
  return (
    <div className={`${divider ? 'border-l-[1.5px] border-[var(--band-line)]' : ''} ${className}`}>
      {children}
    </div>
  )
}

// Small uppercase caption used inside the band ("POINTS TO WIN", "CONFIG", ...).
export function BandCaption({ children }: { children: ReactNode }) {
  return <div className="text-[10px] leading-[1.3] font-bold tracking-[0.22em] opacity-80">{children}</div>
}
