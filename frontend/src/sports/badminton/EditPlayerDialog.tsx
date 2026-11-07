import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { ConfirmDialog, DialogShell } from '../../components/ui/Dialog'
import { CloseIcon, SparkleIcon, TrashIcon } from '../../components/ui/icons'
import { Avatar } from './Avatar'
import { AVATAR_COLORS, avatarColorFor, hueOf, lookFields, lookOf, type PlayerLook } from './avatarStyle'
import { ColourSwatches } from './ColourSwatches'
import { CustomColourStep } from './CustomColourStep'
import { useBadminton } from './context'
import { allPlayers, MAX_NAME_LENGTH, sameName, TEAM_IDS, validateName } from './game'
import { TEAM_COLORS, TEAM_TINTS, type Player } from './schema'

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const sameLook = (a: PlayerLook, b: PlayerLook) =>
  a.mode === b.mode &&
  (a.mode !== 'preset' || a.presetId === (b as typeof a).presetId) &&
  (a.mode !== 'custom' || a.hue === (b as typeof a).hue)

// Edit a saved player's name and avatar colour, or delete them. Opened from Manage players;
// `player` is null when closed. Nothing is saved until "Save changes"; closing discards.
export function EditPlayerDialog({ player, onClose }: { player: Player | null; onClose: () => void }) {
  // Keep the last player while the card fades out (after a delete it's gone from the roster).
  const [shown, setShown] = useState(player)
  if (player && player !== shown) setShown(player)
  const titleId = useId()

  return (
    // The shell unmounts its content once closed, so each opening starts a fresh draft.
    <DialogShell open={player !== null} onDismiss={onClose} labelledBy={titleId} className="max-h-full overflow-y-auto">
      {shown && <EditPlayer key={shown.id} player={shown} titleId={titleId} onClose={onClose} />}
    </DialogShell>
  )
}

function EditPlayer({ player, titleId, onClose }: { player: Player; titleId: string; onClose: () => void }) {
  const { game, court, config, dispatch } = useBadminton()
  const [name, setName] = useState(player.name)
  const [look, setLook] = useState<PlayerLook>(() => lookOf(player))
  const [confirming, setConfirming] = useState(false)
  // Which view the card shows; the custom colour step replaces the form in place.
  const [step, setStep] = useState<'edit' | 'custom'>('edit')
  const formRef = useRef<HTMLFormElement>(null)
  const returning = useRef(false)
  const inputId = useId()
  const errorId = useId()

  const trimmed = name.trim()
  // Empty just disables Save; only a clash gets a message.
  const error = trimmed ? validateName(trimmed, allPlayers(game), player.id) : null
  // Auto follows the name; an unchanged name keeps the saved colour.
  const autoColor = player.color && sameName(trimmed || player.name, player.name) ? player.color : avatarColorFor(trimmed)
  const customHue = look.mode === 'custom' ? look.hue : player.colorMode === 'custom' ? player.hue : undefined
  const preview = { name: trimmed || player.name, color: autoColor, ...lookFields(look) }
  const changed = trimmed !== player.name || !sameLook(look, lookOf(player))
  const canSave = !!trimmed && !error && changed

  const team = TEAM_IDS.find((t) => court.teams[t].ids.includes(player.id))
  const teamColor = team ? config.teamColors[team] : null

  // Coming back from the custom step puts focus on the rainbow swatch again.
  useEffect(() => {
    if (step !== 'edit' || !returning.current) return
    returning.current = false
    formRef.current?.querySelector<HTMLElement>('[role=radiogroup] [role=radio]:last-child')?.focus()
  }, [step])

  function backToEdit() {
    returning.current = true
    setStep('edit')
  }

  function save(e: FormEvent) {
    e.preventDefault()
    if (!canSave) return
    dispatch({ type: 'editPlayer', id: player.id, name: trimmed, look })
    onClose()
  }

  function remove() {
    dispatch({ type: 'deletePlayer', id: player.id })
    setConfirming(false)
    onClose()
  }

  if (step === 'custom') {
    // Starts at the draft custom hue (the saved one unless changed), else near the current colour.
    const currentBg = look.mode === 'preset' ? AVATAR_COLORS[look.presetId].bg : AVATAR_COLORS[autoColor].bg
    return (
      <CustomColourStep
        titleId={titleId}
        name={trimmed || player.name}
        autoColor={autoColor}
        teamColor={TEAM_COLORS[teamColor ?? config.teamColors.a]}
        initialHue={customHue ?? hueOf(currentBg)}
        onBack={backToEdit}
        onUse={(hue) => {
          setLook({ mode: 'custom', hue })
          backToEdit()
        }}
      />
    )
  }

  return (
    <form ref={formRef} onSubmit={save} className="flex flex-col">
      <div className="flex items-center justify-between pt-3 pr-3 pl-5">
        <h2 id={titleId} className="text-xl font-extrabold">
          Edit player
        </h2>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="flex size-11 items-center justify-center rounded-control bg-soft text-ink active:opacity-75"
        >
          <CloseIcon />
        </button>
      </div>

      <div className="flex flex-col items-center gap-2 px-5 pt-1.5" aria-hidden>
        <Avatar player={preview} size={84} />
        {teamColor && (
          <div
            className="flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-bold"
            style={{ backgroundColor: TEAM_TINTS[teamColor].bg, color: TEAM_TINTS[teamColor].fg }}
          >
            <span className="size-2 rounded-full" style={{ backgroundColor: TEAM_COLORS[teamColor] }} />
            On court · Team {titleCase(teamColor)}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5 px-5 pt-4">
        <label htmlFor={inputId} className="text-[11px] font-extrabold tracking-[0.2em] text-muted">
          NAME
        </label>
        <input
          id={inputId}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={MAX_NAME_LENGTH}
          autoComplete="off"
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={`h-12 rounded-[14px] border-[1.5px] bg-white px-3.5 text-base font-semibold text-ink outline-none ${
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

      <div className="flex flex-col gap-2.5 px-5 pt-[18px]">
        <div className="text-[11px] font-extrabold tracking-[0.2em] text-muted">AVATAR COLOUR</div>
        <ColourSwatches
          name={trimmed || player.name}
          autoColor={autoColor}
          value={look}
          customHue={customHue}
          onChange={setLook}
          onCustom={() => setStep('custom')}
        />
        <p className="flex items-center gap-1.5 text-xs text-subtle">
          <SparkleIcon className="shrink-0" />
          {look.mode === 'custom' ? (
            <span>
              <span className="font-bold text-muted">Custom colour</span> in use. Tap the rainbow swatch to adjust it.
            </span>
          ) : (
            <span>
              <span className="font-bold text-muted">Auto</span> uses the colour picked from the player's name.
            </span>
          )}
        </p>
      </div>

      <div className="mt-5 flex items-center justify-between gap-2.5 border-t border-soft px-5 pt-3.5 pb-[18px]">
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="-ml-3 flex h-12 items-center gap-1.5 rounded-[14px] px-3 text-sm font-bold text-danger active:bg-danger-soft"
        >
          <TrashIcon size={17} />
          Delete
        </button>
        <button
          type="submit"
          disabled={!canSave}
          className="h-12 rounded-[14px] bg-band px-[22px] text-[15px] font-extrabold text-white active:opacity-80 disabled:bg-line disabled:text-subtle"
        >
          Save changes
        </button>
      </div>

      {/* Stacks over this card; cancelling comes back here with the draft intact. */}
      <ConfirmDialog
        open={confirming}
        title={`Delete ${player.name}?`}
        description={
          team ? (
            <>
              {player.name} is on court for Team {titleCase(config.teamColors[team])}. Their spot will be empty
              until you pick someone else.
            </>
          ) : (
            "They'll be removed from your players. Match history keeps their name."
          )
        }
        confirmLabel="Delete player"
        cancelLabel="Keep player"
        onConfirm={remove}
        onCancel={() => setConfirming(false)}
      />
    </form>
  )
}
