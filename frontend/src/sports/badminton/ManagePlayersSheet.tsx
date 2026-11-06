import { useState } from 'react'
import { BottomSheet } from '../../components/ui/BottomSheet'
import { EditIcon, PlusIcon } from '../../components/ui/icons'
import { newId } from '../../lib/id'
import { Avatar } from './Avatar'
import { useBadminton } from './context'
import { allPlayers, sortByName } from './game'
import { NewPlayerDialog } from './NewPlayerDialog'
import { EditPlayerDialog } from './EditPlayerDialog'

// Saved players only (the defaults can't be renamed or deleted), A–Z. Tapping one opens
// Edit player; "Add player" opens the New player card. Both stack over this sheet.
export function ManagePlayersSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { game, dispatch } = useBadminton()
  const [adding, setAdding] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const saved = sortByName(game.players)
  const selected = saved.find((p) => p.id === selectedId) ?? null
  const count = saved.length

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      eyebrow={`Badminton · ${count} ${count === 1 ? 'player' : 'players'}`}
      title="Manage players"
      subheader={
        <div className="px-4 pt-3.5">
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-band text-[15px] font-extrabold text-white active:opacity-80"
          >
            <PlusIcon size={18} />
            Add player
          </button>
        </div>
      }
      fade
    >
      <div className="flex flex-col gap-1.5 px-4 pt-3 pb-10">
        <p className="px-0.5 pb-1 text-xs font-semibold text-subtle">
          {count === 0 ? 'No saved players yet. Add one to use them on court.' : 'Tap a player to edit their name or colour'}
        </p>
        <ul className="grid grid-cols-3 gap-x-1.5 gap-y-0.5">
          {saved.map((player) => (
            <li key={player.id} className="relative min-w-0">
              <button
                type="button"
                aria-label={`Edit ${player.name}`}
                onClick={() => setSelectedId(player.id)}
                className="flex w-full flex-col items-center gap-[7px] rounded-2xl px-1 py-2 active:bg-soft"
              >
                <Avatar player={player} size={60} />
                <span className="max-w-full truncate text-sm font-bold">{player.name}</span>
              </button>
              {/* Edit badge on the avatar's top-right. A sibling of the tile (buttons can't nest)
                  with a 44px tap area around the 26px circle; it repeats the tile's action, so
                  it's skipped by screen readers and Tab. */}
              <button
                type="button"
                tabIndex={-1}
                aria-hidden
                onClick={() => setSelectedId(player.id)}
                className="group absolute -top-[7px] left-[calc(50%+4px)] flex size-11 items-center justify-center"
              >
                <span className="flex size-[26px] items-center justify-center rounded-full border-[1.5px] border-line-strong bg-white text-band shadow-[0_1px_3px_rgba(14,18,26,0.18)] group-active:bg-soft">
                  <EditIcon size={12} strokeWidth={2.8} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <NewPlayerDialog
        open={adding}
        onClose={() => setAdding(false)}
        players={allPlayers(game)}
        primaryLabel="Add player"
        onPrimary={(name) => {
          dispatch({ type: 'addPlayer', id: newId(), name })
          setAdding(false)
        }}
      />
      <EditPlayerDialog player={selected} onClose={() => setSelectedId(null)} />
    </BottomSheet>
  )
}
