type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

// Tile and wrapper dimensions per size, taken from the mockups.
const SIZES: Record<Size, { tile: string; wrap: string }> = {
  xs: { tile: 'h-8 min-w-[22px] rounded text-[20px]', wrap: 'gap-[3px] p-1 rounded-[7px]' },
  sm: { tile: 'h-[34px] min-w-[26px] rounded text-[18px]', wrap: 'gap-[3px] p-1 rounded-[7px]' },
  md: { tile: 'h-9 min-w-7 rounded text-[22px]', wrap: 'gap-[3px] p-1 rounded-[7px]' },
  lg: { tile: 'h-12 min-w-[34px] rounded-[5px] text-[32px]', wrap: 'gap-[3px] p-[5px] rounded-[9px]' },
  xl: { tile: 'h-[54px] min-w-10 rounded-md text-[36px]', wrap: 'gap-1 p-1.5 rounded-[10px]' },
}

export type FlipTile = { value: string | number; marker?: string }

type FlipDigitsProps = {
  // One tile per entry. Use `digits(n)` to give each digit its own tile.
  tiles: (string | number | FlipTile)[]
  size?: Size
  // Yellow ring around the whole board (e.g. the winning score).
  ring?: boolean
  className?: string
  label?: string
}

// Courtside flip scoreboard: dark board, slate tiles, yellow digits, optional team-colour
// marker along the bottom of a tile.
export function FlipDigits({ tiles, size = 'md', ring = false, className = '', label }: FlipDigitsProps) {
  const s = SIZES[size]
  return (
    <div
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={`inline-flex bg-flip ${s.wrap} ${ring ? 'shadow-[0_0_0_3px_var(--color-flip-digit)]' : ''} ${className}`}
    >
      {tiles.map((t, i) => {
        const tile = typeof t === 'object' ? t : { value: t }
        return (
          <span
            key={i}
            className={`flex items-center justify-center bg-flip-tile px-1 leading-none font-extrabold text-flip-digit tabular-nums ${s.tile}`}
            style={tile.marker ? { boxShadow: `inset 0 -3px 0 ${tile.marker}` } : undefined}
          >
            {tile.value}
          </span>
        )
      })}
    </div>
  )
}
