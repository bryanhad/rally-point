import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { BackIcon } from '../../components/ui/icons'
import { useEscape } from '../../components/ui/overlay'
import { Avatar } from './Avatar'
import { customColors, type AvatarColor } from './avatarStyle'
import { PlayerChip } from './Court'

// Rainbow behind the hue slider (from the mockup).
const HUE_TRACK =
  'linear-gradient(90deg, hsl(0,70%,62%), hsl(45,80%,55%), hsl(90,55%,50%), hsl(150,55%,46%), hsl(195,70%,50%), hsl(240,65%,64%), hsl(285,60%,62%), hsl(330,70%,62%), hsl(360,70%,62%))'

type CustomColourStepProps = {
  titleId: string
  // Draft name, for the previews.
  name: string
  autoColor: AvatarColor
  // Team colour (hex) for the on-court chip preview.
  teamColor: string
  initialHue: number
  // Back (or Escape): drop the change.
  onBack: () => void
  // "Use this colour": select it in Edit player. Doesn't save.
  onUse: (hue: number) => void
}

// The Edit player card's second view: pick a custom avatar colour by hue, previewed as the
// avatar and as the chip on court.
export function CustomColourStep({ titleId, name, autoColor, teamColor, initialHue, onBack, onUse }: CustomColourStepProps) {
  const [hue, setHue] = useState(initialHue)
  const sliderRef = useRef<HTMLInputElement>(null)
  // Registered after the dialog's own Escape, so it wins: Escape steps back, not out.
  useEscape(true, onBack)
  useEffect(() => sliderRef.current?.focus(), [])

  const preview = { name, color: autoColor, colorMode: 'custom' as const, hue }

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-1.5 pt-3 pr-5 pl-2">
        <button
          type="button"
          aria-label="Back to Edit player"
          onClick={onBack}
          className="flex size-11 shrink-0 items-center justify-center rounded-control text-ink active:bg-soft"
        >
          <BackIcon size={22} />
        </button>
        <div className="flex min-w-0 flex-col gap-px">
          <div className="text-[11px] font-extrabold tracking-[0.2em] text-muted">EDIT PLAYER</div>
          <h2 id={titleId} className="text-xl font-extrabold">
            Custom colour
          </h2>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2.5 px-5 pt-[22px]" aria-hidden>
        <Avatar player={preview} size={120} />
        <div className="max-w-full truncate text-[17px] font-extrabold">{name}</div>
      </div>

      {/* The real court chip, on a strip of court green. */}
      <div className="px-5 pt-[18px]" aria-hidden>
        <div className="flex items-center justify-between gap-3 rounded-[14px] bg-court-inner px-3 py-2">
          <div className="pointer-events-none min-w-0">
            <PlayerChip player={preview} half="left" color={teamColor} serving={false} receiving={false} />
          </div>
          <span className="shrink-0 text-[11px] font-extrabold tracking-[0.18em] text-white/85">ON COURT</span>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 px-5 pt-[22px]">
        <div className="flex items-baseline justify-between">
          <label htmlFor={`${titleId}-hue`} className="text-[11px] font-extrabold tracking-[0.2em] text-muted">
            HUE
          </label>
          <span className="text-xs font-semibold text-subtle">Slide to change</span>
        </div>
        <input
          ref={sliderRef}
          id={`${titleId}-hue`}
          type="range"
          min={0}
          max={359}
          step={1}
          value={hue}
          onChange={(e) => setHue(Number(e.target.value))}
          aria-label="Avatar hue"
          aria-valuetext={`Hue ${hue}`}
          className="hue-range"
          style={{ '--hue-track': HUE_TRACK, '--thumb': customColors(hue).bg } as CSSProperties}
        />
      </div>

      <div className="mt-6 border-t border-soft px-5 pt-3.5 pb-[18px]">
        <button
          type="button"
          onClick={() => onUse(hue)}
          className="h-[50px] w-full rounded-[14px] bg-band text-[15px] font-extrabold text-white active:opacity-80"
        >
          Use this colour
        </button>
      </div>
    </div>
  )
}
