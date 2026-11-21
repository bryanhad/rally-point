// The app's shuttle, inline (no extra request, scales cleanly). Drawn from icons/mark.svg and
// icons/shuttle-mono.svg: a shuttlecock tilted as if in flight.

const FEATHERS = 'M200 312 L150 96 Q256 70 362 96 L312 312 Z'
const BAND = 'M210 250 Q256 240 302 250'
const SHAFTS = 'M222 312 L196 92 M256 312 V82 M290 312 L316 92'
const CORK = 'M196 312 H316 V340 A60 60 0 0 1 196 340 Z'

// White feathers and the gold cork, for the blue home band (the app icon without its tile).
export function RallyMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="60 60 392 392" aria-hidden className={className}>
      <g transform="rotate(-38 256 256)">
        <path d={FEATHERS} fill="#FFFFFF" />
        <path d={BAND} stroke="var(--color-band)" strokeWidth="12" fill="none" strokeLinecap="round" opacity=".55" />
        <path d={SHAFTS} stroke="var(--color-band)" strokeWidth="10" strokeLinecap="round" opacity=".35" />
        <path d={CORK} fill="var(--color-accent)" />
      </g>
    </svg>
  )
}

// The same shuttle in brand blue only, for the session icon on home.
export function ShuttleMono({ size = 34, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="60 60 392 392" aria-hidden className={className}>
      <g transform="rotate(-38 256 256)">
        <path d={FEATHERS} fill="var(--color-band)" opacity=".3" />
        <path d={BAND} stroke="var(--color-band)" strokeWidth="14" fill="none" strokeLinecap="round" opacity=".8" />
        <path d={SHAFTS} stroke="var(--color-band)" strokeWidth="12" strokeLinecap="round" opacity=".7" />
        <path d={CORK} fill="var(--color-band)" />
      </g>
    </svg>
  )
}
