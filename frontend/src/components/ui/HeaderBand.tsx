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
}: HeaderBandProps) {
  return (
    <header
      className={`shrink-0 rounded-b-band bg-band px-2 text-white ${BOTTOM[bottom]} ${className}`}
      style={{ paddingTop: 'max(4px, env(safe-area-inset-top))' }}
    >
      {align === 'left' ? (
        <div className="flex h-12 items-center justify-between pl-2">
          <div className="truncate text-[13px] font-extrabold tracking-[0.32em]">{title}</div>
          <div>{right}</div>
        </div>
      ) : (
        <div className="grid h-12 grid-cols-[44px_1fr_44px] items-center">
          <div>{left}</div>
          <div className="truncate text-center text-[13px] font-extrabold tracking-[0.32em]">{title}</div>
          <div>{right}</div>
        </div>
      )}
      {children && (
        <div className="mx-2 flex items-stretch rounded-[14px] border-[1.5px] border-[var(--band-line)]">
          {children}
        </div>
      )}
    </header>
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
