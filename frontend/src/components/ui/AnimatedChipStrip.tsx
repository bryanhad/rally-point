import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { usePrefersReducedMotion } from './overlay'

export type StripItem = { key: string; render: (latest: boolean) => ReactNode }

const EASE_OPEN = 'cubic-bezier(.2,.8,.2,1)'

// A row of chips, newest on the left, where a new head chip pops in and a removed one pops out:
// - added: its slot opens (width 0 → its own, 200ms) so the older chips slide right, and the chip
//   pops from the centre 40ms in (scale 0.4 → 1.12 → 1 over 280ms, fading in over 150ms);
// - removed: the chip shrinks and fades (160ms), then its slot closes (180ms, from 80ms).
// A new change lands any running animation at its end first, so fast taps never queue. Reduced
// motion: opacity only, the slot changes width at once. `gap` is the space after each chip (the
// slot's right padding, so it opens and closes with the chip). The newest chip is `latest`.
// `empty` shows in its place with no chips (the strip stays mounted, so the first chip pops in
// and the last one pops out too).
export function AnimatedChipStrip({
  items,
  gap,
  className = '',
  empty,
}: {
  items: StripItem[]
  gap: number
  className?: string
  empty?: ReactNode
}) {
  const reduced = usePrefersReducedMotion()
  const keys = items.map((i) => i.key).join('|')

  // The chip popping out: kept (drawn as it was, without the latest ring) until its slot closes.
  const [prev, setPrev] = useState({ keys, items })
  const [leaving, setLeaving] = useState<StripItem | null>(null)
  if (prev.keys !== keys) {
    const head = prev.items[0]
    setLeaving(head && !items.some((i) => i.key === head.key) && items[0]?.key === prev.items[1]?.key ? head : null)
    setPrev({ keys, items })
  }

  const slots = useRef(new Map<string, HTMLElement>())
  const leavingRef = useRef<HTMLElement | null>(null)
  const before = useRef(keys)

  useLayoutEffect(() => {
    const old = before.current.split('|')
    before.current = keys
    const animations: Animation[] = []
    const head = items[0]
    // A new chip at the head (a rally, or Redo).
    if (head && !old.includes(head.key) && keys !== '') {
      const slot = slots.current.get(head.key)
      const chip = slot?.firstElementChild as HTMLElement | null
      if (slot && chip) {
        if (!reduced) {
          animations.push(
            slot.animate([{ width: '0px' }, { width: `${slot.offsetWidth}px` }], { duration: 200, easing: EASE_OPEN }),
            chip.animate(
              [
                { transform: 'scale(0.4)', opacity: 0 },
                { opacity: 1, offset: 0.54 },
                { transform: 'scale(1.12)', offset: 0.68 },
                { transform: 'scale(1)', opacity: 1 },
              ],
              { duration: 280, delay: 40, easing: 'ease-out', fill: 'backwards' },
            ),
          )
        } else {
          animations.push(chip.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150, fill: 'backwards' }))
        }
      }
    }
    // The head chip removed (Undo).
    const out = leavingRef.current
    const outChip = out?.firstElementChild as HTMLElement | null
    if (out && outChip) {
      const shrink = outChip.animate(
        reduced ? [{ opacity: 1 }, { opacity: 0 }] : [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(0.4)', opacity: 0 }],
        { duration: 160, easing: 'ease-in', fill: 'forwards' },
      )
      const close = reduced
        ? shrink
        : out.animate([{ width: `${out.offsetWidth}px` }, { width: '0px' }], { duration: 180, delay: 80, easing: EASE_OPEN, fill: 'forwards' })
      animations.push(shrink, close)
      close.onfinish = () => setLeaving(null)
    }
    // The next change lands these at their end state first.
    return () => animations.forEach((a) => a.finish())
    // `items` is captured through `keys`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys, reduced])

  if (items.length === 0 && !leaving) return <>{empty}</>
  return (
    <div className={`flex ${className}`}>
      {leaving && (
        <span
          ref={(el) => {
            leavingRef.current = el
          }}
          aria-hidden
          inert
          className="pointer-events-none flex shrink-0 justify-center overflow-visible"
          style={{ paddingRight: gap }}
        >
          {leaving.render(false)}
        </span>
      )}
      {items.map((item, i) => (
        <span
          key={item.key}
          ref={(el) => {
            if (el) slots.current.set(item.key, el)
            else slots.current.delete(item.key)
          }}
          className="flex shrink-0 justify-center overflow-visible"
          style={{ paddingRight: gap }}
        >
          {item.render(i === 0)}
        </span>
      ))}
    </div>
  )
}
