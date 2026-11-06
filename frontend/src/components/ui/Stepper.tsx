import { useState, type ReactNode } from 'react'

type StepButtonProps = {
  label: string
  onClick: () => void
  disabled?: boolean
  size?: 'md' | 'lg'
  children: ReactNode
}

// Square − / + button: 52px soft (points to win) or 44px white (inside a tinted row).
export function StepButton({ label, onClick, disabled, size = 'md', children }: StepButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`flex shrink-0 items-center justify-center text-ink active:opacity-70 disabled:text-disabled ${
        size === 'lg' ? 'size-[52px] rounded-[14px] bg-soft' : 'size-11 rounded-[10px] bg-white'
      }`}
    >
      {children}
    </button>
  )
}

// Number box that shows the given value unless the user is typing in it, so − / + stay in
// sync. Only whole numbers >= 1 are committed; an invalid entry reverts on blur.
export function NumberInput({ id, value, onCommit }: { id: string; value: number; onCommit: (n: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null)
  const text = draft ?? String(value)
  const valid = /^\d+$/.test(text) && Number(text) >= 1
  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      value={text}
      onFocus={() => setDraft(String(value))}
      onChange={(e) => {
        setDraft(e.target.value)
        if (/^\d+$/.test(e.target.value) && Number(e.target.value) >= 1) onCommit(Number(e.target.value))
      }}
      onBlur={() => setDraft(null)}
      aria-invalid={!valid}
      className={`h-11 w-11 rounded-[10px] border-[1.5px] bg-white text-center text-base font-extrabold text-ink tabular-nums ${
        valid ? 'border-line-strong' : 'border-danger'
      }`}
    />
  )
}
