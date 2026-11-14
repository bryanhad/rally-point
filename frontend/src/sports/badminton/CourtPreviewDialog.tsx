import { useId, type ReactNode } from 'react'
import { DialogShell } from '../../components/ui/Dialog'
import { CloseIcon } from '../../components/ui/icons'
import { Court } from './Court'
import { ServerIcon, SidesIcon } from './icons'
import type { ScoreboardView } from './scoreboardView'

// Tablet only: the court diagram and its actions, which the B2 main screen leaves out. Opened
// from the band's Court button over the darkened scoreboard. Tapping a chip opens Change player
// on top of this card; picking someone comes back here.
export function CourtPreviewDialog({ open, onClose, v }: { open: boolean; onClose: () => void; v: ScoreboardView }) {
  const titleId = useId()
  return (
    <DialogShell
      open={open}
      onDismiss={onClose}
      labelledBy={titleId}
      width="max-w-[min(948px,calc(100vw-48px))]"
      backdrop="rgba(20,26,38,0.62)"
      // Scrolls inside when the screen is shorter than the card.
      className="max-h-[calc(100dvh-48px)] gap-4 overflow-y-auto rounded-[28px]! px-6 pt-5 pb-6"
    >
      <div className="flex items-center justify-between">
        <h2 id={titleId} className="text-xl font-extrabold">
          Court
        </h2>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="flex size-12 items-center justify-center rounded-[14px] bg-soft text-ink active:opacity-75"
        >
          <CloseIcon />
        </button>
      </div>

      <Court
        court={v.court}
        byId={v.byId}
        colors={v.config.teamColors}
        size="lg"
        onPick={v.onPick}
        onSwapPartners={v.onSwapPartners}
      />

      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-2">
          <PreviewButton label="Sides" aria="Swap player sides" icon={<SidesIcon />} onClick={v.onSides} />
          <PreviewButton
            label="Server"
            aria="Swap server side"
            icon={<ServerIcon />}
            onClick={v.onServer}
            // Only before the first rally, as on the phone.
            disabled={v.started}
          />
        </div>
        <p className="text-right text-sm text-muted">
          Tap a player to change them.
          {v.onSwapPartners && (
            <>
              <br />
              Use the swap buttons on the court to swap partners.
            </>
          )}
        </p>
      </div>
    </DialogShell>
  )
}

function PreviewButton({
  label,
  aria,
  icon,
  onClick,
  disabled,
}: {
  label: string
  aria: string
  icon: ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={aria}
      onClick={onClick}
      disabled={disabled}
      className="flex h-12 items-center gap-1.5 rounded-[14px] bg-soft px-4 text-[15px] font-bold text-ink enabled:active:opacity-75 disabled:bg-softer disabled:text-disabled"
    >
      {icon}
      {label}
    </button>
  )
}
