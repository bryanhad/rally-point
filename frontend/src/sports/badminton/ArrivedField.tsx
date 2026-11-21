import { useId } from 'react'
import { MinusIcon, PlusIcon } from '../../components/ui/icons'
import { SatOut } from './SessionPlayersList'

// When a player added mid-session arrived, as "joined after game N" (what the session record
// stores; sat-out and the queue order derive from it). Three choices:
// - Just now (the default) = after the latest game: they start as "Not played yet";
// - From start = after game 0;
// - After game… = a stepper from 1 to games − 1.
// The option shown is derived from the value, so there's nothing else to keep in sync.
// Not shown before the first game (every choice would be the same).
export function ArrivedField({
  games,
  value,
  onChange,
}: {
  // Finished games in the session so far.
  games: number
  value: number
  onChange: (joinedAfterGame: number) => void
}) {
  const labelId = useId()
  if (games < 1) return null
  const choice = value >= games ? 'now' : value <= 0 ? 'start' : 'after'
  const options = [
    { key: 'now', label: 'Just now', value: games },
    { key: 'start', label: 'From start', value: 0 },
    // Needs a game strictly between the start and now.
    { key: 'after', label: 'After game…', value: games - 1, disabled: games < 2 },
  ] as const
  const satOut = games - Math.min(Math.max(value, 0), games)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <span id={labelId} className="text-[11px] font-extrabold tracking-[0.2em] text-muted">
          ARRIVED
        </span>
        <span className="text-xs text-subtle">
          {games} {games === 1 ? 'game' : 'games'} played so far
        </span>
      </div>
      <div role="radiogroup" aria-labelledby={labelId} className="flex gap-[3px] rounded-[13px] bg-soft p-[3px]">
        {options.map((o) => {
          const on = choice === o.key
          return (
            <button
              key={o.key}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={'disabled' in o && o.disabled}
              // Picking "After game…" again keeps the game already chosen.
              onClick={() => !on && onChange(o.value)}
              className={`h-[38px] min-w-0 flex-1 rounded-[10px] px-1 text-[13px] whitespace-nowrap disabled:opacity-40 ${
                on ? 'bg-white font-extrabold text-band-ink shadow-[0_1px_3px_rgba(20,26,38,0.15)]' : 'font-bold text-muted'
              }`}
            >
              {o.label}
            </button>
          )
        })}
      </div>
      {choice === 'after' && (
        <div className="flex h-[52px] items-center justify-between rounded-[14px] border-[1.5px] border-line-strong pr-1.5 pl-3.5">
          <span className="text-[15px] font-bold">After game</span>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              aria-label="Earlier"
              disabled={value <= 1}
              onClick={() => onChange(value - 1)}
              className="flex size-10 items-center justify-center rounded-control bg-soft text-ink active:opacity-75 disabled:opacity-40"
            >
              <MinusIcon size={18} />
            </button>
            <span aria-live="polite" className="min-w-[26px] text-center text-xl font-extrabold tabular-nums">
              {value}
            </span>
            <button
              type="button"
              aria-label="Later"
              disabled={value >= games - 1}
              onClick={() => onChange(value + 1)}
              className="flex size-10 items-center justify-center rounded-control bg-soft text-ink active:opacity-75 disabled:opacity-40"
            >
              <PlusIcon size={18} />
            </button>
          </div>
        </div>
      )}
      {/* How they'll enter the queue, in the list's own style (the wait the ordering uses). */}
      <div className="flex flex-wrap items-center gap-1.5 text-[13px] text-muted">
        Starts in the queue as
        {satOut === 0 ? (
          <span className="flex items-center gap-[5px] text-xs font-extrabold text-[#7A5A00]">
            <span className="size-[9px] rounded-full border-2 border-[#C99A1E]" />
            Not played yet
          </span>
        ) : (
          <SatOut count={satOut} />
        )}
      </div>
    </div>
  )
}
