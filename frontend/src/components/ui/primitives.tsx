import type { ButtonHTMLAttributes, ReactNode } from 'react'

// Uppercase section heading: small, heavy, widely tracked, muted.
export function SectionLabel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`text-xs font-extrabold tracking-[0.18em] text-muted uppercase ${className}`}>{children}</div>
  )
}

// White card on the page background.
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`flex flex-col gap-3.5 rounded-card bg-white p-4 ${className}`}>{children}</section>
}

type Tone = 'soft' | 'ghost' | 'band' | 'primary' | 'ink' | 'danger-soft' | 'white'

const TONES: Record<Tone, string> = {
  soft: 'bg-soft text-ink',
  ghost: 'bg-transparent text-ink-2',
  band: 'bg-transparent text-white active:bg-white/15',
  primary: 'bg-band text-white',
  ink: 'bg-ink text-white',
  'danger-soft': 'bg-danger-soft text-danger',
  white: 'bg-white text-ink',
}

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  tone?: Tone
  // Visible text next to the icon. Icon-only buttons must pass `aria-label`.
  label?: ReactNode
  icon?: ReactNode
}

// Touch-friendly button (at least 44x44). Disabled buttons fade to the soft disabled style.
export function Button({ tone = 'soft', label, icon, className = '', type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={`flex h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-control text-[13px] font-bold ${
        label ? 'px-3' : ''
      } ${TONES[tone]} enabled:active:opacity-75 disabled:bg-softer disabled:text-disabled ${className}`}
      {...rest}
    >
      {icon}
      {label}
    </button>
  )
}
