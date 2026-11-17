// Pieces shared by the phone and tablet scoreboard layouts: the view data both receive, the
// band tiles, the match type switch and the court overlays.
import { digits } from '../../components/ui/digits'
import { FlipDigits } from '../../components/ui/FlipDigits'
import { BandTile } from '../../components/ui/HeaderBand'
import { ChevronRightIcon, EditIcon, PlusIcon, SwapIcon, UserPlusIcon } from '../../components/ui/icons'
import { Avatar } from './Avatar'
import { sortByName } from './game'
import { Racket, Rackets } from './icons'
import { dayLabel, timeLabel } from './session'
import type { Config, Player, Session, SideSwitch } from './schema'

const TILE_CAPTION =
  'truncate text-[10px] leading-none font-bold tracking-[0.2em] opacity-85 max-[389px]:tracking-[0.12em]'

// Singles / doubles, on the blue band right after Back. Phone: a labelled pill switch centred in
// the title row. Tablet: square icon-only segments. Tapping the current mode does nothing.
export function ModeSwitch({
  mode,
  onMode,
  size = 'phone',
}: {
  mode: Config['mode']
  onMode: (mode: Config['mode']) => void
  size?: 'phone' | 'tablet'
}) {
  const tablet = size === 'tablet'
  return (
    <div
      role="group"
      aria-label="Match type"
      className={`flex shrink-0 bg-white/16 p-[3px] ${tablet ? 'h-[52px] rounded-[14px]' : 'h-9 rounded-full'}`}
    >
      {(['singles', 'doubles'] as const).map((m) => {
        const label = m === 'singles' ? 'Singles' : 'Doubles'
        const active = mode === m
        return (
          <button
            key={m}
            type="button"
            onClick={active ? undefined : () => onMode(m)}
            aria-label={label}
            aria-pressed={active}
            title={tablet ? label : undefined}
            className={`flex items-center justify-center ${
              tablet ? 'w-[54px] rounded-[11px]' : 'h-[30px] gap-1.5 rounded-full px-3 text-[13px] font-extrabold'
            } ${
              active
                ? `bg-white text-band ${tablet ? 'shadow-[0_1px_3px_rgba(20,26,38,0.2)]' : 'shadow-[0_1px_3px_rgba(20,26,38,0.18)]'}`
                : 'text-white/88 active:bg-white/10'
            }`}
          >
            {m === 'singles' ? (
              <Racket className={tablet ? '' : 'h-[18px] w-3.5'} strokeWidth={tablet ? 2 : 2.2} />
            ) : (
              <Rackets className={tablet ? '' : 'h-[18px] w-5'} strokeWidth={tablet ? 2 : 2.2} />
            )}
            {!tablet && label}
          </button>
        )
      })}
    </div>
  )
}

// Court overlay with no session running: play starts with a session.
export function NoSessionOverlay({ onStart }: { onStart: () => void }) {
  return (
    <>
      <div className="text-[11px] font-extrabold tracking-[0.22em] text-white/80">NO SESSION</div>
      <button
        type="button"
        onClick={onStart}
        className="flex h-12 items-center gap-2 rounded-[14px] bg-white px-[22px] text-[15px] font-extrabold text-band-ink active:opacity-85"
      >
        <PlusIcon size={18} />
        Start a session
      </button>
    </>
  )
}

// Court overlay before each game of a session: pick its players, or keep last game's.
export function PickOverlay({
  gameNumber,
  same,
  onPick,
  onSame,
}: {
  gameNumber: number
  same: Player[] | null
  onPick: () => void
  onSame: () => void
}) {
  return (
    <>
      <div className="text-[11px] font-extrabold tracking-[0.22em] text-white/80">NEXT UP · GAME {gameNumber}</div>
      <button
        type="button"
        onClick={onPick}
        className="flex h-12 items-center gap-2 rounded-[14px] bg-white px-[22px] text-[15px] font-extrabold text-band-ink active:opacity-85"
      >
        <UserPlusIcon size={18} />
        Pick players
      </button>
      {same && (
        <button
          type="button"
          onClick={onSame}
          aria-label={`Same players: ${same.map((p) => p.name).join(', ')}`}
          className="flex h-10 items-center gap-2 rounded-control border-[1.5px] border-white/55 pr-3.5 pl-2 text-[13px] font-bold text-white active:bg-white/10"
        >
          <span className="flex" aria-hidden>
            {same.map((p, i) => (
              <Avatar key={p.id} player={p} size={22} className={`border-2 border-[#3A3F49] ${i > 0 ? '-ml-[9px]' : ''}`} />
            ))}
          </span>
          Same players
        </button>
      )}
    </>
  )
}

// "today", "yesterday", "3 days ago", "12 Nov": the day label, read aloud.
function spokenDay(at: number) {
  const label = dayLabel(at)
  if (label === 'Today' || label === 'Yesterday') return label.toLowerCase()
  return label.replace(/^(\d)d ago$/, '$1 days ago')
}

// Left band tile: when the session started and who's in it, or a prompt to start one. Opens
// the Session sheet either way. `wide` (tablet band): fixed width, 60px tall, "day · time".
export function SessionTile({
  session,
  players,
  onClick,
  wide = false,
}: {
  session: Session | null
  players: Player[]
  onClick: () => void
  wide?: boolean
}) {
  const frame = wide
    ? // Keeps its width when there's room; shrinks (text cut off) when the band is tight (744px).
      'h-[60px]! w-[270px] min-w-0 shrink gap-2.5 pr-2.5 pl-3.5 tablet-portrait:w-[230px]'
    : 'flex-1 gap-1.5 pr-2 pl-3'
  const iconClassName = wide ? 'size-7!' : 'max-[389px]:hidden'
  if (!session) {
    return (
      <BandTile
        className={frame}
        onClick={onClick}
        aria-label="No session. Start a session"
        icon={<PlusIcon size={13} />}
        iconClassName={iconClassName}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className={`truncate font-extrabold opacity-85 ${wide ? 'text-sm' : 'text-[13px]'}`}>No session</div>
          <span className="flex h-[22px] items-center self-start rounded-full bg-white px-2.5 text-xs font-extrabold text-band-ink">
            Start
          </span>
        </div>
      </BandTile>
    )
  }
  const inSession = sortByName(players.filter((p) => session.playerIds.includes(p.id)))
  const extra = inSession.length - 3
  const count = `${inSession.length} ${inSession.length === 1 ? 'player' : 'players'}`
  const avatar = wide ? 26 : 24
  return (
    <BandTile
      className={frame}
      onClick={onClick}
      aria-label={`Session: ${spokenDay(session.startedAt)} at ${timeLabel(session.startedAt)}, ${count}. Open session`}
      icon={<ChevronRightIcon size={13} />}
      // Below 390px the phone tile is too narrow for the chevron next to the avatars.
      iconClassName={iconClassName}
    >
      <div className={`flex min-w-0 flex-1 flex-col ${wide ? 'gap-[5px]' : 'gap-1.5'}`}>
        {/* Phone: day only (the time is in the Session sheet; the tile has no room for both). */}
        <div className={`truncate font-extrabold ${wide ? 'text-sm' : 'text-[13px]'}`}>
          {dayLabel(session.startedAt)}
          {wide && ` · ${timeLabel(session.startedAt)}`}
        </div>
        {/* Fixed-size avatars overlapping by half: later ones may cover earlier initials, but
            they never squash. */}
        <div className="flex min-w-0 items-center overflow-hidden" aria-hidden>
          {inSession.slice(0, 3).map((p, i) => (
            <Avatar
              key={p.id}
              player={p}
              size={avatar}
              className="border-2 border-band-tile"
              style={i > 0 ? { marginLeft: -avatar / 2 } : undefined}
            />
          ))}
          {extra > 0 && (
            <span className={`ml-1.5 shrink-0 font-extrabold whitespace-nowrap ${wide ? 'text-sm' : 'text-[13px]'}`}>
              +{extra}
            </span>
          )}
        </div>
      </div>
    </BandTile>
  )
}

// Right band tile: points to win and the auto swap rule. Opens the Game rules sheet.
export function RulesTile({ config, onClick, wide = false }: { config: Config; onClick: () => void; wide?: boolean }) {
  return (
    <BandTile
      className={wide ? 'h-[60px]! shrink-0 gap-2.5 px-2.5' : 'shrink-0 gap-2.5'}
      onClick={onClick}
      aria-label={`Game rules: ${config.totalPoints} points to win, ${swapRuleLabel(config.sideSwitch)}. Edit`}
      icon={<EditIcon size={13} />}
      iconClassName={wide ? 'size-7!' : ''}
    >
      <FlipDigits tiles={digits(config.totalPoints)} size="xs" />
      <div className="flex min-w-0 flex-col gap-[5px]">
        <div className={TILE_CAPTION}>POINTS TO WIN</div>
        <AutoSwapStatus sideSwitch={config.sideSwitch} />
      </div>
    </BandTile>
  )
}

// Rule in words, for the tile's accessible name.
function swapRuleLabel(sideSwitch: SideSwitch) {
  if (sideSwitch.kind === 'off') return 'auto swap sides off'
  if (sideSwitch.kind === 'half') return 'swap sides at half'
  return `swap sides every ${sideSwitch.points} points`
}

// Auto swap sides state on the rules tile: the rule plus an ON/OFF pill.
function AutoSwapStatus({ sideSwitch }: { sideSwitch: SideSwitch }) {
  const on = sideSwitch.kind !== 'off'
  const text = sideSwitch.kind === 'off' ? 'Off' : sideSwitch.kind === 'half' ? 'At half' : `Every ${sideSwitch.points}`
  return (
    <div className="flex h-5 min-w-0 items-center gap-[5px] text-[13px] leading-none font-bold whitespace-nowrap">
      {/* Dropped on narrow screens, where the rule text needs the room. */}
      <SwapIcon size={14} className="shrink-0 max-[389px]:hidden" />
      <span className="truncate">{text}</span>
      <span
        className={`inline-flex h-4 shrink-0 items-center rounded-full px-1.5 text-[9px] leading-none font-extrabold tracking-[0.08em] ${
          on ? 'bg-flip-digit text-ink' : 'bg-white/20 text-white'
        }`}
      >
        {on ? 'ON' : 'OFF'}
      </span>
    </div>
  )
}
