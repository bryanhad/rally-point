import { CheckIcon, LockIcon, PlusIcon, SearchIcon } from '../../components/ui/icons'
import { Avatar } from './Avatar'
import { TILE_SM } from './playerList'
import type { Player } from './schema'

// Shared pieces of every player list (Manage players, Change player, Session players,
// New session): the "Find a player" input, the New player tile and the 3-column grid.

export function FindPlayerInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="relative">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-faint" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Find a player"
        aria-label="Find a player"
        autoComplete="off"
        className="h-[46px] w-full rounded-[14px] bg-soft pr-3.5 pl-[42px] text-base outline-none placeholder:text-faint focus-visible:ring-2 focus-visible:ring-band"
      />
    </div>
  )
}

export function NoMatch({ query }: { query: string }) {
  return <p className="px-1 py-4 text-center text-sm text-muted">No players match “{query.trim()}”</p>
}

// Looks like a player tile, with a dashed + circle. Always first in the grid.
export function NewPlayerTile({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`${TILE_SM} text-band-ink active:bg-soft`}>
      <span className="flex size-14 items-center justify-center rounded-full border-2 border-dashed border-[#9DB8D4]">
        <PlusIcon size={20} />
      </span>
      <span className="text-[13px] font-bold">New player</span>
    </button>
  )
}

// Select mode (Session players, New session): a check badge on the avatar's top-right, a ring
// when selected, an empty circle when not. A locked tile (e.g. on court) stays selected in grey
// with a lock and a short note, and can't be tapped.
export function SelectTile({
  player,
  selected,
  onToggle,
  lockedNote,
}: {
  player: Player
  selected: boolean
  onToggle: () => void
  // "On court", "Needed for doubles", …
  lockedNote?: string
}) {
  const locked = !!lockedNote
  const ring = locked ? 'var(--color-faint)' : 'var(--color-band)'
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      aria-disabled={locked || undefined}
      aria-label={locked ? `${player.name}, ${lockedNote.toLowerCase()}, can't be removed` : player.name}
      onClick={locked ? undefined : onToggle}
      className={`${TILE_SM} ${locked ? 'cursor-default gap-1!' : 'active:bg-soft'}`}
    >
      <span className="relative block size-14 shrink-0">
        <Avatar
          player={player}
          size={56}
          style={{ boxShadow: selected ? `0 0 0 2.5px #FFFFFF, 0 0 0 4.5px ${ring}` : undefined }}
        />
        {selected ? (
          <span
            className={`absolute -top-1 -right-1.5 flex size-[22px] items-center justify-center rounded-full border-2 border-white text-white ${locked ? 'bg-subtle' : 'bg-band'}`}
          >
            <CheckIcon size={11} strokeWidth={3.6} />
          </span>
        ) : (
          <span className="absolute -top-1 -right-1.5 size-[22px] rounded-full border-[1.5px] border-line-dashed bg-white" />
        )}
      </span>
      <span className={`max-w-full truncate text-[13px] ${selected ? 'font-bold text-ink' : 'font-semibold text-ink-2'}`}>
        {player.name}
      </span>
      {locked && (
        <span className="flex max-w-full items-center gap-[3px] truncate text-[11px] font-bold text-muted">
          <LockIcon className="shrink-0" />
          {lockedNote}
        </span>
      )}
    </button>
  )
}
