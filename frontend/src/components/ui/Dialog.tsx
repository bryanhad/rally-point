import { useId, useRef, type ComponentProps, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { TrashIcon } from './icons'
import { usePresence, usePrefersReducedMotion, useEscape, useFocusHandoff, useScrollLock } from './overlay'

const DURATION = 200

type DialogProps = {
  open: boolean
  // Called by Escape and by tapping the overlay. Omit to require a choice from the buttons.
  onDismiss?: () => void
  role?: 'dialog' | 'alertdialog'
  // Soft badge above the title (icon on a tinted rounded square).
  badge?: ReactNode
  badgeTone?: 'danger' | 'accent' | 'gold'
  title: ReactNode
  description?: ReactNode
  // Stacked full-width buttons (first = primary action).
  actions: ReactNode
  // Extra content between the description and the actions.
  children?: ReactNode
  // Element that receives focus when the dialog opens (defaults to the dialog itself).
  initialFocus?: RefObject<HTMLElement | null>
}

const BADGE_TONES = {
  danger: 'bg-danger-soft text-danger',
  accent: 'bg-accent-soft text-band-ink',
  gold: 'bg-[#FDF6E3] text-crown-edge',
}

type DialogShellProps = {
  open: boolean
  // Called by Escape and by tapping the overlay. Omit to require a choice from the buttons.
  onDismiss?: () => void
  role?: 'dialog' | 'alertdialog'
  // Id of the element naming the dialog (its title).
  labelledBy: string
  describedBy?: string
  // Element that receives focus when the dialog opens (defaults to the card itself).
  initialFocus?: RefObject<HTMLElement | null>
  // Layout of the card's content (padding, gap, alignment); the frame itself is fixed.
  className?: string
  // Width classes for the card. Default: max-w-sm on phones, 440px on tablets (confirmations
  // and prompts). Bigger dialogs pass their own (480px forms, 520-600px grids and lists).
  width?: string
  // Backdrop colour (default --overlay-dialog).
  backdrop?: string
  children: ReactNode
}

// The frame every dialog shares: a white card centred over its own overlay, with fade/scale
// animation, scroll lock, Escape and focus handling. Content and layout come from the caller.
// Sheets and dialogs share one z-index, so whichever opened last is on top (each portal is
// appended to <body> when it opens): a dialog over a sheet gets a darker second overlay, and a
// sheet opened from a dialog (e.g. Change player from the Court preview) covers it.
export function DialogShell({
  open,
  onDismiss,
  role = 'dialog',
  labelledBy,
  describedBy,
  initialFocus,
  className = '',
  width = 'max-w-sm tablet:max-w-[440px]',
  backdrop = 'var(--overlay-dialog)',
  children,
}: DialogShellProps) {
  const { mounted, shown } = usePresence(open, DURATION)
  const reduced = usePrefersReducedMotion()
  useScrollLock(mounted)
  useEscape(open && !!onDismiss, () => onDismiss?.())
  const cardRef = useFocusHandoff<HTMLDivElement>(open && mounted, initialFocus)

  if (!mounted) return null
  const visible = shown && open

  return createPortal(
    // 24px from the screen edges on tablets (16px on phones).
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 tablet:p-6">
      <div
        aria-hidden
        onClick={onDismiss}
        className="absolute inset-0"
        style={{ backgroundColor: backdrop, opacity: visible ? 1 : 0, transition: `opacity ${DURATION}ms ease-out` }}
      />
      <div
        ref={cardRef}
        role={role}
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        className={`relative flex w-full ${width} flex-col rounded-dialog bg-white shadow-[0_20px_50px_rgba(14,18,26,0.3)] outline-none ${className}`}
        style={{
          opacity: visible ? 1 : 0,
          transform: reduced || visible ? 'none' : 'scale(0.96)',
          transition: `opacity ${DURATION}ms ease-out, transform ${DURATION}ms ease-out`,
        }}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}

// Centred badge + title + description + stacked buttons, in a DialogShell.
export function Dialog({
  open,
  onDismiss,
  role = 'dialog',
  badge,
  badgeTone = 'accent',
  title,
  description,
  actions,
  children,
  initialFocus,
}: DialogProps) {
  const titleId = useId()
  const descId = useId()
  return (
    <DialogShell
      open={open}
      onDismiss={onDismiss}
      role={role}
      labelledBy={titleId}
      describedBy={description ? descId : undefined}
      initialFocus={initialFocus}
      className="items-center gap-3.5 px-5 pt-[22px] pb-5 text-center"
    >
      {badge && (
        <div className={`flex size-14 items-center justify-center rounded-card ${BADGE_TONES[badgeTone]}`}>
          {badge}
        </div>
      )}
      <div className="flex flex-col gap-2">
        <h2 id={titleId} className="text-xl font-extrabold">
          {title}
        </h2>
        {description && (
          <div id={descId} className="text-[15px] leading-[1.45] text-muted">
            {description}
          </div>
        )}
      </div>
      {children}
      <div className="mt-1.5 flex w-full flex-col gap-2">{actions}</div>
    </DialogShell>
  )
}

// Full-width 50px dialog buttons: `ink` for the confirming action, `soft` for keep/cancel.
export function DialogButton({
  tone = 'soft',
  children,
  ...rest
}: ComponentProps<'button'> & { tone?: 'ink' | 'soft' | 'primary' }) {
  const tones = { ink: 'bg-ink text-white font-extrabold', soft: 'bg-soft text-ink font-bold', primary: 'bg-band text-white font-extrabold' }
  return (
    <button
      type="button"
      className={`h-[50px] w-full rounded-[14px] text-[15px] active:opacity-80 ${tones[tone]}`}
      {...rest}
    >
      {children}
    </button>
  )
}

type ConfirmDialogProps = {
  open: boolean
  title: ReactNode
  // One line stating exactly what will be lost; put the count in <strong>.
  description: ReactNode
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
  // 'danger' shows the soft-red trash badge; 'neutral' a soft-blue badge with `icon`.
  tone?: 'danger' | 'neutral'
  icon?: ReactNode
}

// Destructive (or consequential) confirmation. Focus starts on the safe button; Escape and
// the overlay cancel. The confirm button is dark slate, not red.
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  tone = 'danger',
  icon,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  return (
    <Dialog
      open={open}
      role="alertdialog"
      onDismiss={onCancel}
      badge={icon ?? <TrashIcon size={26} withLines />}
      badgeTone={tone === 'danger' ? 'danger' : 'accent'}
      title={title}
      description={description}
      initialFocus={cancelRef}
      actions={
        <>
          <DialogButton tone="ink" onClick={onConfirm}>
            {confirmLabel}
          </DialogButton>
          <DialogButton ref={cancelRef} tone="soft" onClick={onCancel}>
            {cancelLabel}
          </DialogButton>
        </>
      }
    />
  )
}
