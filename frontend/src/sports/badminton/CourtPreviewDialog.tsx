import { useId } from 'react'
import { DialogShell } from '../../components/ui/Dialog'
import { CloseIcon } from '../../components/ui/icons'
import { Court } from './Court'
import { GamePointToast } from './GamePointToast'
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
        onSwapSides={v.onSides}
        onChangeServer={v.started ? undefined : v.onServer}
        // Game point: the team's half glows, and the toast (with its dim) plays on this court.
        glow={v.gamePoint && { team: v.gamePoint.team, fast: !!v.gamePoint.toast }}
        toast={
          v.gamePoint?.toast && (
            <GamePointToast key={v.gamePoint.toast.id} toast={v.gamePoint.toast} color={v.config.teamColors[v.gamePoint.team]} dim />
          )
        }
      />

      {/* Two lines tall either way, so the card keeps its height when the swap line goes. */}
      <div className="flex min-h-10 items-center justify-end gap-4">
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
