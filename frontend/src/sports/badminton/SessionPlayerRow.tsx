import type { CSSProperties, ReactNode } from 'react'
import { ChevronRightIcon, PlusIcon } from '../../components/ui/icons'
import { Avatar } from './Avatar'
import { Flame, Trophy } from './icons'
import { TEAM_COLORS, TEAM_TINTS, type Config } from './schema'
import { statusLabel, type PlayerStats } from './sessionStats'

// One row of the session player lists (Change player, Pick players): avatar with ring and
// streak flame, name, status line, games count, then whatever the list adds on the right.

const GOLD_RING = '#E2B33C'
const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

type SessionPlayerRowProps = {
  row: PlayerStats
  teamColors: Config['teamColors']
  onClick?: () => void
  // Shown after the games count (Pick players' check).
  trailing?: ReactNode
  // Extra text for the screen reader label (", on Team Red").
  labelSuffix?: string
  disabled?: boolean
  style?: CSSProperties
}

export function SessionPlayerRow({
  row,
  teamColors,
  onClick,
  trailing,
  labelSuffix = '',
  disabled = false,
  style,
}: SessionPlayerRowProps) {
  const { player, onCourt, wonLast, streak } = row
  const team = onCourt ? teamColors[onCourt] : null
  // The team ring wins over the gold one.
  const ring = team ? TEAM_COLORS[team] : wonLast ? GOLD_RING : null
  const label = [
    player.name,
    plural(row.games, 'game'),
    team && `on court for Team ${titleCase(team)}`,
    row.status === 'won-last' && 'won last game',
    streak > 0 && `${streak} in a row`,
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      aria-disabled={disabled || undefined}
      aria-label={label + labelSuffix}
      className={`flex w-full items-center gap-3 rounded-[14px] px-2.5 py-[9px] text-left ${disabled ? 'cursor-default' : 'active:bg-soft'}`}
      style={style}
    >
      <span className="relative mr-1 flex shrink-0">
        <Avatar
          player={player}
          size={44}
          style={ring ? { boxShadow: `0 0 0 2px #FFFFFF, 0 0 0 ${team ? 4 : 4.5}px ${ring}` } : undefined}
        />
        {streak > 0 && <Flame count={streak} className="absolute -right-1.5 -bottom-[5px]" />}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-[15px] font-bold text-ink">{player.name}</span>
        <StatusLine row={row} teamColors={teamColors} />
      </span>
      <span aria-hidden className="flex w-10 shrink-0 flex-col items-center">
        <span className="text-[22px] leading-none font-extrabold tabular-nums">{row.games}</span>
        <span className="text-[10px] font-bold tracking-[0.04em] text-muted">{row.games === 1 ? 'game' : 'games'}</span>
      </span>
      {trailing}
    </button>
  )
}

function StatusLine({ row, teamColors }: { row: PlayerStats; teamColors: Config['teamColors'] }) {
  const text = statusLabel(row)
  switch (row.status) {
    case 'on-court': {
      // Just "On court": the dot and text colour say which team (the label names it).
      const team = teamColors[row.onCourt!]
      return (
        <span className="flex items-center gap-[5px] text-xs font-bold whitespace-nowrap" style={{ color: TEAM_TINTS[team].fg }}>
          <span className="size-[7px] shrink-0 rounded-full" style={{ backgroundColor: TEAM_COLORS[team] }} />
          {text}
        </span>
      )
    }
    case 'won-last':
      return (
        <span className="flex items-center gap-[5px] text-xs font-extrabold whitespace-nowrap text-[#7A5A00]">
          <Trophy className="shrink-0" />
          {text}
        </span>
      )
    case 'sat-out':
      return (
        <span className="flex items-center gap-1.5 text-xs font-bold whitespace-nowrap text-band-ink">
          {text}
          <span className="flex gap-[3px]">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={`size-[9px] rounded-full ${i < row.satOut ? 'bg-band-ink' : 'bg-[#D9E3EE]'}`} />
            ))}
          </span>
          {row.satOut}
        </span>
      )
    case 'not-played':
      return (
        <span className="flex items-center gap-[5px] text-xs font-extrabold whitespace-nowrap text-[#7A5A00]">
          <span className="size-[9px] rounded-full border-2 border-[#C99A1E]" />
          {text}
        </span>
      )
    default:
      return <span className="truncate text-xs font-semibold text-subtle">{text}</span>
  }
}

// "New player" first row: dashed + circle, a line saying what happens, chevron.
export function NewPlayerRow({ note, onClick }: { note: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-[14px] px-2.5 py-2 text-left text-band-ink active:bg-soft"
    >
      <span className="flex size-[38px] shrink-0 items-center justify-center rounded-full border-2 border-dashed border-[#9DB8D4]">
        <PlusIcon size={18} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[15px] font-extrabold">New player</span>
        <span className="truncate text-xs font-semibold text-muted">{note}</span>
      </span>
      <ChevronRightIcon size={18} className="shrink-0 text-subtle" />
    </button>
  )
}

// Divider + "🔥 games in a row" under the New player row.
export function FlameLegend() {
  return (
    <>
      <div className="mx-2.5 my-1 h-px bg-soft" />
      <div aria-hidden className="flex items-center gap-1.5 px-2.5 pt-1 pb-1.5 text-[11px] font-semibold text-muted">
        <Flame count={2} />
        games in a row
      </div>
    </>
  )
}
