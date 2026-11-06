import type { KeyboardEvent } from 'react'
import { PlusIcon, SparkleIcon } from '../../components/ui/icons'
import { AVATAR_COLOR_NAMES, AVATAR_COLORS, customColors, initials, type AvatarColor, type PlayerLook } from './avatarStyle'

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
// Selected swatch: a white gap, then a dark outer ring. No other marker.
const SELECTED_RING = '0 0 0 2.5px #FFFFFF, 0 0 0 5px var(--color-ink)'
const RAINBOW = 'conic-gradient(#E5484D, #F2C94C, #46A758, #12A594, #3E63DD, #8E4EC6, #E5484D)'

type ColourSwatchesProps = {
  // Draft name: every swatch shows its first initial.
  name: string
  // The name-based colour the Auto swatch shows.
  autoColor: AvatarColor
  value: PlayerLook
  // The player's custom hue, if they have one (fills the custom swatch).
  customHue?: number
  onChange: (look: PlayerLook) => void
  // Tapping the custom swatch.
  onCustom: () => void
}

// Avatar colour picker: Auto, the 16 presets, then Custom, as a 6-column radio group.
// Arrow keys move through it like any radio group (Custom only takes focus; Enter opens it).
export function ColourSwatches({ name, autoColor, value, customHue, onChange, onCustom }: ColourSwatchesProps) {
  const letter = initials(name)[0] ?? '?'

  const items: { key: string; label: string; checked: boolean; select: () => void }[] = [
    { key: 'auto', label: 'Auto, colour from name', checked: value.mode === 'auto', select: () => onChange({ mode: 'auto' }) },
    ...AVATAR_COLOR_NAMES.map((id) => ({
      key: id,
      label: `${titleCase(id)}${id === autoColor ? ', from name' : ''}`,
      checked: value.mode === 'preset' && value.presetId === id,
      select: () => onChange({ mode: 'preset', presetId: id }),
    })),
    {
      key: 'custom',
      label:
        value.mode === 'custom'
          ? 'Custom colour. Tap to adjust'
          : customHue !== undefined
            ? 'Custom colour'
            : 'Pick a custom colour',
      checked: value.mode === 'custom',
      select: onCustom,
    },
  ]
  const focusIndex = Math.max(0, items.findIndex((i) => i.checked))

  function onKeyDown(e: KeyboardEvent, index: number) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]
    if (!step) return
    e.preventDefault()
    const next = (index + step + items.length) % items.length
    const swatch = e.currentTarget.parentElement?.children[next] as HTMLElement | undefined
    swatch?.focus()
    if (items[next].key !== 'custom') items[next].select()
  }

  const custom = customHue !== undefined ? customColors(customHue) : null

  return (
    <div role="radiogroup" aria-label="Avatar colour" className="grid grid-cols-6 justify-items-center gap-2.5">
      {items.map((item, i) => {
        const base = {
          type: 'button' as const,
          role: 'radio',
          'aria-checked': item.checked,
          'aria-label': item.label,
          tabIndex: i === focusIndex ? 0 : -1,
          onClick: item.select,
          onKeyDown: (e: KeyboardEvent) => onKeyDown(e, i),
          style: { boxShadow: item.checked ? SELECTED_RING : undefined },
          className:
            'relative flex aspect-square w-full max-w-[42px] items-center justify-center rounded-full text-[15px] font-extrabold active:opacity-80',
        }
        if (item.key === 'auto') {
          const { bg, fg } = AVATAR_COLORS[autoColor]
          return (
            <button
              key={item.key}
              {...base}
              className={`${base.className} border-2 border-dashed`}
              style={{ ...base.style, backgroundColor: bg, color: fg, borderColor: fg }}
            >
              {letter}
              <span className="absolute -top-[5px] -right-[5px] flex size-[18px] items-center justify-center rounded-full border-2 border-white bg-ink text-serve">
                <SparkleIcon filled />
              </span>
            </button>
          )
        }
        if (item.key === 'custom') {
          return (
            <button key={item.key} {...base} className={`${base.className} p-[3px]`} style={{ ...base.style, background: RAINBOW }}>
              <span
                className="flex size-full items-center justify-center rounded-full text-sm"
                style={custom ? { backgroundColor: custom.bg, color: custom.fg } : { backgroundColor: '#FFFFFF', color: 'var(--color-ink)' }}
              >
                {custom ? letter : <PlusIcon size={16} />}
              </span>
            </button>
          )
        }
        const { bg, fg } = AVATAR_COLORS[item.key as AvatarColor]
        return (
          <button key={item.key} {...base} style={{ ...base.style, backgroundColor: bg, color: fg }}>
            {letter}
          </button>
        )
      })}
    </div>
  )
}
