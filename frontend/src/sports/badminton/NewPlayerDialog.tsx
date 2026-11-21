import { useId, useRef, useState, type FormEvent, type ReactNode, type RefObject } from 'react'
import { DialogShell } from '../../components/ui/Dialog'
import { CloseIcon } from '../../components/ui/icons'
import { ArrivedField } from './ArrivedField'
import { Avatar } from './Avatar'
import { avatarColorFor } from './avatarStyle'
import { MAX_NAME_LENGTH, validateName } from './game'
import type { Player } from './schema'

type NewPlayerDialogProps = {
  open: boolean
  onClose: () => void
  // Everyone the name must differ from (saved players and the defaults).
  players: Player[]
  // Name to start with (e.g. what was typed in the picker's filter).
  initialName?: string
  // Small line above the title (the team, when opened from the picker).
  eyebrow?: ReactNode
  // Primary button label and action, e.g. "Add & replace wiliam" or "Add player".
  // `joinedAfterGame`: the Arrived choice, when `arrival` is set.
  primaryLabel: string
  onPrimary: (name: string, joinedAfterGame: number) => void
  // Optional text button under the primary one ("Just add to players").
  secondaryLabel?: string
  onSecondary?: (name: string, joinedAfterGame: number) => void
  // Mid-session (the player also joins it): ask when they arrived. `games`: finished games so
  // far (the field hides itself before the first one). Defaults to just now.
  arrival?: { games: number }
}

// "New player" card stacked over the sheet that opened it. The avatar previews the initials and
// the colour the player will be saved with.
export function NewPlayerDialog({ open, onClose, ...form }: NewPlayerDialogProps) {
  const titleId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <DialogShell
      open={open}
      onDismiss={onClose}
      labelledBy={titleId}
      initialFocus={inputRef}
      className="gap-4 px-5 pt-3 pb-5"
    >
      {/* Remounted on every opening (the shell unmounts when closed), so the draft starts fresh. */}
      <NewPlayerForm {...form} titleId={titleId} inputRef={inputRef} onClose={onClose} />
    </DialogShell>
  )
}

function NewPlayerForm({
  titleId,
  inputRef,
  onClose,
  players,
  initialName = '',
  eyebrow,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  arrival,
}: Omit<NewPlayerDialogProps, 'open'> & {
  titleId: string
  inputRef: RefObject<HTMLInputElement | null>
}) {
  const [name, setName] = useState(initialName)
  // Just now by default: backdating an arrival has to be a deliberate choice.
  const [arrived, setArrived] = useState(arrival?.games ?? 0)
  const errorId = useId()
  const trimmed = name.trim()
  // Empty is just "not ready yet"; only real problems (duplicate) get a message.
  const error = trimmed ? validateName(trimmed, players) : null
  const ready = !!trimmed && !error

  function submit(e: FormEvent) {
    e.preventDefault()
    if (ready) onPrimary(trimmed, arrived)
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 flex-col gap-0.5 pt-1.5">
          {eyebrow && <div className="truncate text-[11px] font-extrabold tracking-[0.2em] uppercase">{eyebrow}</div>}
          <h2 id={titleId} className="text-xl font-extrabold">
            New player
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

      <div className="flex justify-center" aria-hidden>
        {trimmed ? (
          <Avatar player={{ name: trimmed, color: avatarColorFor(trimmed) }} size={arrival ? 80 : 96} />
        ) : (
          <span className={`flex ${arrival ? 'size-20' : 'size-24'} items-center justify-center rounded-full border-2 border-dashed border-line-dashed bg-[#F2F4F7] text-4xl font-extrabold text-faint`}>
            ?
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${titleId}-name`} className="text-[11px] font-extrabold tracking-[0.2em] text-muted">
          NAME
        </label>
        <input
          ref={inputRef}
          id={`${titleId}-name`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={MAX_NAME_LENGTH}
          placeholder="e.g. Kevin Sanjaya"
          autoComplete="off"
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={`h-[50px] rounded-[14px] border-[1.5px] bg-white px-3.5 text-base text-ink outline-none placeholder:text-faint ${
            error
              ? 'border-danger focus:shadow-[0_0_0_3px_var(--color-danger-soft)]'
              : 'border-line-strong focus:border-band focus:shadow-[0_0_0_3px_var(--color-accent-soft)]'
          }`}
        />
        {error && (
          <p id={errorId} className="px-1 text-sm font-semibold text-danger">
            {error}
          </p>
        )}
      </div>

      {arrival && <ArrivedField games={arrival.games} value={arrived} onChange={setArrived} />}

      <div className="mt-0.5 flex flex-col gap-2">
        <button
          type="submit"
          disabled={!ready}
          className="h-[50px] truncate rounded-[14px] bg-band px-3 text-[15px] font-extrabold text-white active:opacity-80 disabled:bg-line disabled:text-subtle"
        >
          {primaryLabel}
        </button>
        {secondaryLabel && onSecondary && (
          <button
            type="button"
            disabled={!ready}
            onClick={() => onSecondary(trimmed, arrived)}
            className="h-11 rounded-[14px] text-sm font-bold text-band-ink active:bg-soft disabled:text-faint"
          >
            {secondaryLabel}
          </button>
        )}
      </div>
    </form>
  )
}
