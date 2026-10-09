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

// Centred card dialog over a darker second overlay, so it stacks above an open bottom sheet.
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
  const { mounted, shown } = usePresence(open, DURATION)
  const reduced = usePrefersReducedMotion()
  useScrollLock(mounted)
  useEscape(open && !!onDismiss, () => onDismiss?.())
  const cardRef = useFocusHandoff<HTMLDivElement>(open && mounted, initialFocus)
  const titleId = useId()
  const descId = useId()

  if (!mounted) return null
  const visible = shown && open

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        aria-hidden
        onClick={onDismiss}
        className="absolute inset-0 bg-[var(--overlay-dialog)]"
        style={{ opacity: visible ? 1 : 0, transition: `opacity ${DURATION}ms ease-out` }}
      />
      <div
        ref={cardRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className="relative flex w-full max-w-sm flex-col items-center gap-3.5 rounded-dialog bg-white px-5 pt-[22px] pb-5 text-center shadow-[0_20px_50px_rgba(14,18,26,0.3)] outline-none"
        style={{
          opacity: visible ? 1 : 0,
          transform: reduced || visible ? 'none' : 'scale(0.96)',
          transition: `opacity ${DURATION}ms ease-out, transform ${DURATION}ms ease-out`,
        }}
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
      </div>
    </div>,
    document.body,
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
