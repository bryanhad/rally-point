import { useId, useState, type ReactNode } from 'react'
import { DialogShell } from '../../components/ui/Dialog'
import { CloseIcon } from '../../components/ui/icons'
import { ArrivedField } from './ArrivedField'
import { Avatar } from './Avatar'
import type { Player } from './schema'

type AddToSessionDialogProps = {
  // The registered player outside the session who was tapped; null when closed.
  player: Player | null
  onClose: () => void
  // Finished games in the session so far (Arrived hides itself before the first one).
  games: number
  // Small line above the title (the team and slot being filled).
  eyebrow?: ReactNode
  // "Add & put in slot" / "Add & put in for wiliam".
  primaryLabel: string
  onAdd: (player: Player, joinedAfterGame: number) => void
}

// "Add to this session": tapping a NOT IN SESSION player asks when they arrived before they
// join (and go into the slot / in for the current player).
export function AddToSessionDialog({ player, onClose, ...rest }: AddToSessionDialogProps) {
  const titleId = useId()
  // Keep the last player while the card fades out.
  const [shown, setShown] = useState(player)
  if (player && player !== shown) setShown(player)
  return (
    <DialogShell open={player !== null} onDismiss={onClose} labelledBy={titleId} className="gap-4 px-5 pt-3 pb-5">
      {/* Remounted on every opening, so Arrived starts at Just now. */}
      {shown && <AddForm {...rest} player={shown} titleId={titleId} onClose={onClose} />}
    </DialogShell>
  )
}

function AddForm({
  player,
  titleId,
  onClose,
  games,
  eyebrow,
  primaryLabel,
  onAdd,
}: Omit<AddToSessionDialogProps, 'player'> & { player: Player; titleId: string }) {
  const [arrived, setArrived] = useState(games)
  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 flex-col gap-0.5 pt-1.5">
          {eyebrow && <div className="truncate text-[11px] font-extrabold tracking-[0.2em] uppercase">{eyebrow}</div>}
          <h2 id={titleId} className="text-xl font-extrabold">
            Add to this session
          </h2>
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-control bg-soft text-ink active:opacity-75"
        >
          <CloseIcon />
        </button>
      </div>
      <div className="flex items-center gap-3 rounded-[14px] bg-[#F5F7FA] px-3 py-2.5">
        <Avatar player={player} size={48} />
        <span className="min-w-0 truncate text-base font-extrabold">{player.name}</span>
      </div>
      <ArrivedField games={games} value={arrived} onChange={setArrived} />
      <button
        type="button"
        onClick={() => onAdd(player, arrived)}
        className="h-[50px] truncate rounded-[14px] bg-band px-3 text-[15px] font-extrabold text-white active:opacity-80"
      >
        {primaryLabel}
      </button>
    </div>
  )
}
