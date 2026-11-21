import { useEffect, useRef, useState, type ReactNode } from 'react'
import { CloseIcon, PlusIcon, SearchIcon } from '../../components/ui/icons'
import { Avatar } from './Avatar'
import { sameName } from './game'
import { Flame, Trophy } from './icons'
import type { QueueEntry, QueueGroup } from './queue'
import { TEAM_COLORS, TEAM_TINTS, type Config, type Player } from './schema'

// The session players list shared by Pick players, Change player and Current Session: groups
// in the fairness order (queue.ts) under sticky section chips, plain white rows with hairline
// dividers, and, while searching, registered players outside the session and a register row.

type Band = { title: string; bg: string; fg: string }
const BANDS: Record<QueueGroup | 'outside', Band> = {
  'just-won': { title: 'JUST WON', bg: '#FFF7E1', fg: '#8A6400' },
  waiting: { title: 'WAITING', bg: '#EAF5F1', fg: '#1E6B52' },
  'just-played': { title: 'JUST PLAYED', bg: '#F1F3F6', fg: '#4A5468' },
  'on-court': { title: 'ON COURT', bg: '#F1EEFB', fg: '#5B3BA8' },
  left: { title: 'LEFT', bg: '#F7F7F9', fg: '#8A93A6' },
  outside: { title: 'NOT IN SESSION', bg: '#EEF0F3', fg: '#5A6478' },
}

const GOLD_RING = '#E2B33C'
const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

// "Find a player", with a clear (×) once something is typed. Sits above the list.
export function PlayerSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
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
        className={`h-11 w-full rounded-[14px] bg-soft pl-[42px] ${value ? 'pr-11' : 'pr-3'} text-base outline-none placeholder:text-faint focus-visible:ring-2 focus-visible:ring-band`}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange('')}
          className="absolute top-1/2 right-1 flex size-10 -translate-y-1/2 items-center justify-center"
        >
          <span className="flex size-6 items-center justify-center rounded-full bg-[#C5CBD6] text-white">
            <CloseIcon size={12} />
          </span>
        </button>
      )}
    </div>
  )
}

type SessionPlayersListProps = {
  entries: readonly QueueEntry[]
  // Every saved player, for NOT IN SESSION and the exact-name check before registering.
  players: readonly Player[]
  // Ids that are in the session but not listed here (the player being replaced).
  hidden?: ReadonlySet<string>
  query: string
  teamColors: Config['teamColors']
  // Pick players rewards last game's winners (gold ring, trophy); the other lists don't.
  winners?: boolean
  onSelect?: (entry: QueueEntry) => void
  // Picked rows (not tappable here) and what sits after the games number.
  isDisabled?: (entry: QueueEntry) => boolean
  trailing?: (entry: QueueEntry) => ReactNode
  labelSuffix?: (entry: QueueEntry) => string
  // While searching: a player outside the session was tapped, or the register row/button.
  onAddOutsider?: (player: Player) => void
  onRegister?: (name: string) => void
  // Section titles that differ in this list (Current Session: "WAITING · UP NEXT").
  groupTitles?: Partial<Record<QueueGroup, string>>
  // The empty state's explanation and button ("Register & add rizky").
  emptyNote?: string
  registerLabel?: (name: string) => string
}

export function SessionPlayersList({
  entries,
  players,
  hidden,
  query,
  teamColors,
  winners = false,
  onSelect,
  isDisabled,
  trailing,
  labelSuffix,
  onAddOutsider,
  onRegister,
  emptyNote,
  registerLabel,
  groupTitles,
}: SessionPlayersListProps) {
  const needle = query.trim().toLowerCase()
  const shown = needle ? entries.filter((e) => e.player.name.toLowerCase().includes(needle)) : entries
  // Grouped in the order the entries come in (queue.ts already sorted them).
  const groups: { group: QueueGroup; rows: QueueEntry[] }[] = []
  for (const entry of shown) {
    const last = groups.at(-1)
    if (last?.group === entry.group) last.rows.push(entry)
    else groups.push({ group: entry.group, rows: [entry] })
  }
  // While searching, registered players who aren't in this session (players who left included).
  const inSession = new Set([...entries.filter((e) => e.group !== 'left').map((e) => e.player.id), ...(hidden ?? [])])
  const outsiders =
    needle && onAddOutsider
      ? players
          .filter((p) => !inSession.has(p.id) && p.name.toLowerCase().includes(needle))
          .sort((x, y) => x.name.localeCompare(y.name, undefined, { sensitivity: 'base' }))
      : []
  // Register only when no registered player already has exactly this name (no duplicates).
  const exact = players.some((p) => sameName(p.name, query))
  const canRegister = !!needle && !!onRegister && !exact
  const nothing = !!needle && shown.length === 0 && outsiders.length === 0

  // One streak tooltip open at a time.
  const [tip, setTip] = useState<string | null>(null)

  if (nothing) {
    return canRegister ? (
      <EmptyState name={query.trim()} note={emptyNote} label={registerLabel?.(query.trim())} onRegister={() => onRegister?.(query.trim())} />
    ) : (
      <p className="px-1 py-6 text-center text-sm text-muted">No players match “{query.trim()}”</p>
    )
  }

  return (
    <div role="list" className="flex flex-col px-3 pb-6">
      {groups.map(({ group, rows }) => (
        <BandGroup key={group} band={{ ...BANDS[group], title: groupTitles?.[group] ?? BANDS[group].title }} count={rows.length}>
          {rows.map((entry, i) => (
            <Row
              key={entry.player.id}
              entry={entry}
              first={i === 0}
              teamColors={teamColors}
              winners={winners}
              onClick={onSelect && (() => onSelect(entry))}
              disabled={isDisabled?.(entry) ?? false}
              trailing={trailing?.(entry)}
              labelSuffix={labelSuffix?.(entry) ?? ''}
              tipOpen={tip === entry.player.id}
              onTip={(open) => setTip(open ? entry.player.id : null)}
            />
          ))}
        </BandGroup>
      ))}
      {outsiders.length > 0 && (
        <BandGroup band={BANDS.outside} count={outsiders.length}>
          {outsiders.map((player, i) => (
            <OutsiderRow key={player.id} player={player} first={i === 0} onClick={() => onAddOutsider?.(player)} />
          ))}
        </BandGroup>
      )}
      {canRegister && (
        <div className="mt-2.5 border-t border-[#EEF1F5] pt-1.5">
          <button
            type="button"
            role="listitem"
            onClick={() => onRegister?.(query.trim())}
            aria-label={`Register ${query.trim()} as a new player`}
            className="flex w-full items-center gap-3 rounded-[14px] px-2.5 py-[9px] text-left text-[#1F5F99] active:bg-soft"
          >
            <span className="mr-1 flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-[#9DB8D4]">
              <PlusIcon size={18} />
            </span>
            <span className="min-w-0 flex-1 truncate text-[15px] font-extrabold">Register “{query.trim()}” as a new player</span>
          </button>
        </div>
      )}
    </div>
  )
}

// A section chip (tinted pill: dot, TITLE, count) and a hairline to the right edge, sticky at
// the top of the scroll area on a 92% white backing so rows don't show through, then its rows.
function BandGroup({ band, count, children }: { band: Band; count: number; children: ReactNode }) {
  return (
    // The first group's gap above it is padding inside its sticky row (not a margin), so the row
    // is stuck from the first pixel of scrolling instead of moving 6px first.
    <div role="group" aria-label={titleCase(band.title.toLowerCase())} className="group/band mt-1.5 first:mt-0">
      <div className="sticky top-0 z-[5] flex h-[38px] items-center gap-2.5 bg-white/92 px-1 group-first/band:h-11 group-first/band:pt-1.5">
        <span
          className="inline-flex h-[26px] shrink-0 items-center gap-[7px] rounded-full px-2.5 text-[11px] font-extrabold tracking-[0.12em]"
          style={{ backgroundColor: band.bg, color: band.fg }}
        >
          <span className="size-1.5 rounded-full" style={{ backgroundColor: band.fg }} />
          {band.title}
          <span className="tabular-nums opacity-60">{count}</span>
        </span>
        <span className="h-px flex-1 bg-[#E6EAF0]" />
      </div>
      {children}
    </div>
  )
}

type RowProps = {
  entry: QueueEntry
  first: boolean
  teamColors: Config['teamColors']
  winners: boolean
  onClick?: () => void
  disabled: boolean
  trailing?: ReactNode
  labelSuffix: string
  tipOpen: boolean
  onTip: (open: boolean) => void
}

function Row({ entry, first, teamColors, winners, onClick, disabled, trailing, labelSuffix, tipOpen, onTip }: RowProps) {
  const { player, onCourt, streak, games } = entry
  const left = entry.group === 'left'
  const won = winners && entry.wonLast
  const team = onCourt ? teamColors[onCourt] : null
  // The team ring wins over the gold one.
  const ring = team ? TEAM_COLORS[team] : won ? GOLD_RING : null
  const label = [
    player.name,
    plural(games, 'game'),
    left && 'left the session',
    team && `on court for Team ${titleCase(team)}`,
    won && 'won last game',
    streak > 0 && `${streak} in a row`,
  ]
    .filter(Boolean)
    .join(', ')
  const interactive = !!onClick && !left

  return (
    <div role="listitem" className={`relative ${first ? '' : 'border-t border-[#EEF1F5]'} ${left ? 'opacity-55' : ''}`}>
      <button
        type="button"
        onClick={disabled || !interactive ? undefined : onClick}
        aria-disabled={disabled || !interactive || undefined}
        aria-label={label + labelSuffix}
        className={`flex w-full items-center gap-3 px-2.5 py-[9px] text-left ${disabled || !interactive ? 'cursor-default' : 'active:bg-soft'}`}
      >
        <span className="relative mr-1 flex shrink-0">
          <Avatar player={player} size={44} style={ring ? { boxShadow: `0 0 0 2px #FFFFFF, 0 0 0 ${team ? 4 : 4.5}px ${ring}` } : undefined} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-[15px] font-bold text-ink">{player.name}</span>
            {left && (
              <span className="shrink-0 rounded-full bg-[#EEF0F3] px-1.5 py-px text-[9px] font-extrabold tracking-[0.1em] text-muted">
                LEFT
              </span>
            )}
          </span>
          <StatusLine entry={entry} teamColors={teamColors} winners={winners} />
        </span>
        <span aria-hidden className="flex w-10 shrink-0 flex-col items-center">
          <span className="text-[22px] leading-none font-extrabold tabular-nums">{games}</span>
          <span className="text-[10px] font-bold tracking-[0.04em] text-muted">{games === 1 ? 'game' : 'games'}</span>
        </span>
        {trailing}
      </button>
      {/* The streak flame: its own button over the avatar (not inside the row's), so tapping it
          shows its tooltip and never selects the row. z-1: above its row, below the sticky bands
          (z-5), so a band scrolled over it covers the flame and its tooltip. */}
      {streak > 0 && <StreakFlame count={streak} open={tipOpen} onOpen={onTip} />}
    </div>
  )
}

// Status line, first rule that matches (v6 styles).
function StatusLine({ entry, teamColors, winners }: { entry: QueueEntry; teamColors: Config['teamColors']; winners: boolean }) {
  if (entry.group === 'left') return <span className="truncate text-xs font-semibold text-subtle">Left the session</span>
  if (entry.onCourt) {
    // Just "On court": the dot and text colour say which team (the label names it).
    const team = teamColors[entry.onCourt]
    return (
      <span className="flex items-center gap-[5px] text-xs font-bold whitespace-nowrap" style={{ color: TEAM_TINTS[team].fg }}>
        <span className="size-[7px] shrink-0 rounded-full" style={{ backgroundColor: TEAM_COLORS[team] }} />
        On court
      </span>
    )
  }
  if (winners && entry.wonLast) {
    return (
      <span className="flex items-center gap-[5px] text-xs font-extrabold whitespace-nowrap text-[#7A5A00]">
        <Trophy className="shrink-0" />
        Won last game
      </span>
    )
  }
  if (entry.streak > 0) {
    return (
      <span className="truncate text-xs font-semibold text-subtle">
        {entry.streak === 1 ? 'Played last game' : `Played ${entry.streak} in a row`}
      </span>
    )
  }
  // Not played and not sat out a game yet: just joined.
  if (entry.games === 0 && entry.satOut === 0) {
    return (
      <span className="flex items-center gap-[5px] text-xs font-extrabold whitespace-nowrap text-[#7A5A00]">
        <span className="size-[9px] rounded-full border-2 border-[#C99A1E]" />
        Not played yet
      </span>
    )
  }
  return <SatOut count={entry.satOut} />
}

// "Sat out ●●●○ 3": four dots filled up to N, then the number.
export function SatOut({ count }: { count: number }) {
  return (
    <span className="flex items-center gap-1.5 text-xs font-bold whitespace-nowrap text-band-ink">
      Sat out
      <span className="flex gap-[3px]">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`size-[9px] rounded-full ${i < count ? 'bg-band-ink' : 'bg-[#D9E3EE]'}`} />
        ))}
      </span>
      {count}
    </span>
  )
}

// The flame on an avatar: tap/click or Enter shows "N games in a row" in a small dark bubble to
// its right, with a soft orange glow. Closes on the next tap anywhere, on scroll, or after 2.5s.
function StreakFlame({ count, open, onOpen }: { count: number; open: boolean; onOpen: (open: boolean) => void }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: Event) => {
      if (e.type === 'pointerdown' && ref.current?.contains(e.target as Node)) return
      onOpen(false)
    }
    const timer = setTimeout(() => onOpen(false), 2500)
    window.addEventListener('pointerdown', close, true)
    window.addEventListener('scroll', close, true)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('pointerdown', close, true)
      window.removeEventListener('scroll', close, true)
    }
  }, [open, onOpen])
  const label = `${count} ${count === 1 ? 'game' : 'games'} in a row`
  return (
    <span ref={ref} className="absolute top-8 left-[38px] z-[1]">
      <span
        role="button"
        tabIndex={0}
        aria-label={label}
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation()
          onOpen(!open)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onOpen(!open)
          }
          if (e.key === 'Escape') onOpen(false)
        }}
        className="block cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-band"
        style={open ? { filter: 'drop-shadow(0 0 4px rgba(232,131,58,0.8))' } : undefined}
      >
        <Flame count={count} />
      </span>
      {open && (
        <span
          role="tooltip"
          className="absolute top-0.5 left-[26px] z-20 rounded-[9px] bg-[#1E2636] px-2.5 py-[7px] text-xs font-bold whitespace-nowrap text-white shadow-[0_6px_16px_rgba(14,18,26,0.25)]"
        >
          <span aria-hidden className="absolute top-2.5 -left-1 size-2.5 rotate-45 rounded-[2px] bg-[#1E2636]" />
          <span className="relative">{label}</span>
        </span>
      )}
    </span>
  )
}

// A registered player outside the session: faded avatar + name, and a dashed + on the right.
function OutsiderRow({ player, first, onClick }: { player: Player; first: boolean; onClick: () => void }) {
  return (
    <div role="listitem" className={first ? '' : 'border-t border-[#EEF1F5]'}>
      <button
        type="button"
        onClick={onClick}
        aria-label={`${player.name}, not in this session. Tap to add`}
        className="flex w-full items-center gap-3 px-2.5 py-[9px] text-left active:bg-soft"
      >
        <span className="mr-1 flex shrink-0 opacity-75">
          <Avatar player={player} size={44} />
        </span>
        <span className="min-w-0 flex-1 truncate text-[15px] font-bold text-ink">{player.name}</span>
        <span aria-hidden className="flex size-6 shrink-0 items-center justify-center rounded-full border-[1.5px] border-dashed border-[#9DB8D4] text-[#1F5F99]">
          <PlusIcon size={12} />
        </span>
      </button>
    </div>
  )
}

// Nobody matches at all: a person/search icon, "No player named …", a line, and a button.
function EmptyState({ name, note, label, onRegister }: { name: string; note?: string; label?: string; onRegister: () => void }) {
  return (
    <div role="status" className="flex flex-col items-center gap-2.5 px-5 pt-9 pb-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-soft text-faint">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="10" cy="8" r="3.5" />
          <path d="M4 20a6 6 0 0 1 9.5-4.9" />
          <circle cx="17.5" cy="17.5" r="3" />
          <path d="M19.7 19.7L22 22" />
        </svg>
      </span>
      <div className="text-base font-extrabold">No player named “{name}”</div>
      {note && <div className="max-w-[260px] text-[13px] leading-[1.4] text-muted">{note}</div>}
      <button
        type="button"
        onClick={onRegister}
        className="mt-1.5 flex h-12 items-center gap-2 rounded-[14px] bg-band px-5 text-[15px] font-extrabold text-white active:opacity-80"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="9" cy="8" r="3.5" />
          <path d="M3 20a6 6 0 0 1 12 0" />
          <path d="M19 8v6" />
          <path d="M16 11h6" />
        </svg>
        {label ?? `Register ${name}`}
      </button>
    </div>
  )
}

