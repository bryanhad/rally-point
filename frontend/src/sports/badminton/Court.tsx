import { Fragment, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { avatarColors, initials } from './avatarStyle'
import {
  EMPTY_SLOT,
  hasEmptySlot,
  receiverId,
  screenRow,
  serverId,
  sideOf,
  TEAM_IDS,
  type CourtState,
  type SideKey,
} from './game'
import { PlusIcon, SwapIcon } from '../../components/ui/icons'
import { Crown, RefereeChair, Shuttle } from './icons'
import { TEAM_COLORS, type Config, type Player, type TeamId } from './schema'

type CourtProps = {
  court: CourtState
  byId: Map<string, Player>
  colors: Config['teamColors']
  // Omit for a read-only court (e.g. a past rally): chips can't be tapped.
  onPick?: (team: TeamId, slot: number) => void
  // Omit to hide the partner-swap buttons; shown on each half that has two players.
  onSwapPartners?: (team: TeamId) => void
  // Players of this team wear the crown.
  crownedTeam?: TeamId
  // Optional row of controls above the court (e.g. mode switch, switch sides/serve).
  top?: ReactNode
  // Covers the whole court with a dark layer holding this content (e.g. "Pick players").
  overlay?: ReactNode
  // 'lg': bigger chips for the tablet's Court preview.
  size?: ChipSize
}

type Cell = { team: TeamId; slot: number; id: string }
type Line = { x1: number; y1: number; x2: number; y2: number }

export function Court({ court, byId, colors, onPick, onSwapPartners, crownedTeam, top, overlay, size = 'md' }: CourtProps) {
  const chip = CHIP[size]
  const avatarLine = CHIP_INSET + chip.avatar / 2
  const server = serverId(court)
  const receiver = receiverId(court)
  // An empty spot darkens the court so the "Tap to pick" chip is all that stands out.
  // An overlay covers it all instead.
  const dimmed = !!onPick && !overlay && hasEmptySlot(court)

  // Place each player in a quadrant of the screen.
  const cells = new Map<string, Cell>()
  for (const team of TEAM_IDS) {
    const half = sideOf(court, team)
    court.teams[team].ids.forEach((id, slot) => {
      cells.set(`${half}-${screenRow(court, team, slot)}`, { team, slot, id })
    })
  }

  // The serve line joins the net-facing ends of the server's and receiver's name pills
  // (at their vertical middle), measured from the DOM so it follows the real layout. Divided by
  // the on-screen scale, so a parent's transform (a dialog scaling in) can't skew it.
  const courtRef = useRef<HTMLDivElement>(null)
  const chipRefs = useRef(new Map<string, HTMLElement>())
  const [line, setLine] = useState<Line | null>(null)

  useLayoutEffect(() => {
    const container = courtRef.current
    if (!container) return
    const measure = () => {
      const from = chipRefs.current.get(server)
      const to = chipRefs.current.get(receiver)
      if (!from || !to) return setLine(null)
      const box = container.getBoundingClientRect()
      // On-screen size / layout size: below 1 while a parent is scaled (a dialog opening).
      const scale = box.width / container.offsetWidth || 1
      const netEdge = (el: HTMLElement) => {
        const r = el.getBoundingClientRect()
        // A pill left of the net faces it with its right end, and vice versa.
        const leftOfNet = r.left + r.width / 2 < box.left + box.width / 2
        // Back to the court's own (unscaled) pixels, measured from inside its white border,
        // where the line's SVG starts.
        return {
          x: ((leftOfNet ? r.right : r.left) - box.left) / scale - container.clientLeft,
          y: (r.top + r.height / 2 - box.top) / scale - container.clientTop,
        }
      }
      const a = netEdge(from)
      const b = netEdge(to)
      setLine({ x1: a.x, y1: a.y, x2: b.x, y2: b.y })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(container)
    return () => observer.disconnect()
  }, [court, server, receiver])

  return (
    <div className="shrink-0">
      {top && <div className="mb-2">{top}</div>}
      <div className={`relative bg-court ${size === 'lg' ? 'rounded-[24px] p-3.5' : 'rounded-card p-2.5'}`}>
        <div
          ref={courtRef}
          className="relative grid aspect-[342/176] grid-cols-2 grid-rows-2 border-2 border-white bg-court-inner"
        >
          {/* Short service lines and centre lines; the net runs down the middle. */}
          <div className="absolute inset-y-0 left-[35%] w-0.5 bg-white/85" />
          <div className="absolute inset-y-0 left-[65%] w-0.5 bg-white/85" />
          <div className="absolute top-1/2 left-0 h-0.5 w-[35%] bg-white/85" />
          <div className="absolute top-1/2 right-0 h-0.5 w-[35%] bg-white/85" />
          <div className="absolute -inset-y-1.5 left-1/2 w-1 -translate-x-1/2 rounded-sm bg-white" />

          {/* Serve direction: drawn before the chips so they sit on top of it. */}
          {line && (
            <svg className="pointer-events-none absolute inset-0 size-full overflow-visible" aria-hidden>
              <line
                {...line}
                stroke="var(--color-serve)"
                // Thicker on the tablet's big court, so it reads from a distance.
                strokeWidth={size === 'lg' ? 4 : 2.5}
                strokeDasharray={size === 'lg' ? '5 9' : '3 6'}
                strokeLinecap="round"
              />
            </svg>
          )}

          {(['left', 'right'] as const).flatMap((half) =>
            (['top', 'bottom'] as const).map((row) => {
              const cell = cells.get(`${half}-${row}`)
              return (
                <div
                  key={`${half}-${row}`}
                  // Chips hug the back of their half so the shuttle never shifts them.
                  className={`relative flex min-w-0 items-center px-1.5 ${half === 'left' ? 'col-start-1 justify-start' : 'col-start-2 justify-end'} ${row === 'top' ? 'row-start-1' : 'row-start-2'}`}
                >
                  {cell?.id === EMPTY_SLOT && (
                    <EmptyChip
                      raised={dimmed}
                      size={size}
                      half={half}
                      color={TEAM_COLORS[colors[cell.team]]}
                      teamName={colors[cell.team]}
                      onClick={onPick && (() => onPick(cell.team, cell.slot))}
                    />
                  )}
                  {cell && cell.id !== EMPTY_SLOT && (
                    <PlayerChip
                      player={byId.get(cell.id) ?? { name: '?' }}
                      size={size}
                      half={half}
                      color={TEAM_COLORS[colors[cell.team]]}
                      serving={cell.id === server}
                      receiving={cell.id === receiver}
                      crowned={cell.team === crownedTeam}
                      pillRef={(el) => {
                        if (el) chipRefs.current.set(cell.id, el)
                        else chipRefs.current.delete(cell.id)
                      }}
                      onClick={onPick && (() => onPick(cell.team, cell.slot))}
                    />
                  )}
                </div>
              )
            }),
          )}

          {/* Partner swap: on each outer edge, on the avatars' centre line, with a faint line from
              the bottom of the top avatar to the top of the bottom one and the button halfway
              along it. The 44px button is the tap area; the 32px circle is what shows. */}
          {onSwapPartners &&
            !dimmed &&
            !overlay &&
            TEAM_IDS.filter((team) => court.teams[team].ids.length === 2).map((team) => {
              const half = sideOf(court, team)
              const [first, second] = court.teams[team].ids.map((id) => byId.get(id)?.name ?? '?')
              const edge = half === 'left' ? 'left' : 'right'
              return (
                <Fragment key={team}>
                  <div
                    aria-hidden
                    className="absolute w-0.5 rounded-full bg-white/55"
                    style={{
                      [edge]: avatarLine - 1,
                      top: `calc(25% + ${chip.avatar / 2}px)`,
                      bottom: `calc(25% + ${chip.avatar / 2}px)`,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => onSwapPartners(team)}
                    aria-label={`Swap ${first} and ${second}`}
                    title={`Swap ${first} and ${second}`}
                    className="group absolute top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center"
                    style={{ [edge]: avatarLine - 22 }}
                  >
                    <span
                      className={`flex items-center justify-center rounded-full border-[2.5px] border-white text-white shadow-[0_1px_4px_rgba(14,18,26,0.25)] group-active:opacity-80 ${size === 'lg' ? 'size-11' : 'size-8'}`}
                      style={{ backgroundColor: TEAM_COLORS[colors[team]] }}
                    >
                      <SwapIcon size={size === 'lg' ? 20 : 15} className="rotate-90" />
                    </span>
                  </button>
                </Fragment>
              )
            })}
        </div>
        {dimmed && <div aria-hidden className="absolute inset-0 z-[5] rounded-[inherit] bg-[rgba(14,18,26,0.62)]" />}
        {overlay && (
          <div className="absolute inset-0 z-[5] flex flex-col items-center justify-center gap-3 rounded-[inherit] bg-[rgba(14,18,26,0.66)] px-5">
            {overlay}
          </div>
        )}
      </div>
      {/* The referee sits at the bottom, at the net, facing the court: this matches what the
          person holding the phone (acting as umpire) sees, so screen left is their left. */}
      <div className="flex h-10 items-center justify-center gap-2 text-sm font-semibold text-muted">
        <RefereeChair />
        Referee
      </div>
    </div>
  )
}

type PlayerChipProps = {
  player: Pick<Player, 'name' | 'color'>
  size?: ChipSize
  half: SideKey
  color: string
  serving: boolean
  receiving: boolean
  crowned: boolean
  // Gets the name pill, whose net-facing end anchors the serve line.
  pillRef?: (el: HTMLSpanElement | null) => void
  onClick?: () => void
}

// Chip geometry: an avatar circle inset 6px from the court's outer edge, and a name pill that
// tucks `tuck` px under it. The partner swap button and its line sit on the avatars' centre line.
type ChipSize = 'md' | 'lg'
const CHIP_INSET = 6
const CHIP = {
  md: { avatar: 50, ring: 3, initials: 15, pill: 30, text: 13, maxPill: 116, tuck: 14, padIn: 20, padOut: 12, plus: 20 },
  lg: { avatar: 68, ring: 4, initials: 20, pill: 40, text: 18, maxPill: 157, tuck: 19, padIn: 27, padOut: 16, plus: 26 },
}

// The name pill's size and the side it tucks under the avatar on.
function pillStyle(c: (typeof CHIP)[ChipSize], right: boolean) {
  return {
    height: c.pill,
    fontSize: c.text,
    lineHeight: `${c.pill}px`,
    [right ? 'marginRight' : 'marginLeft']: -c.tuck,
    paddingLeft: right ? c.padOut : c.padIn,
    paddingRight: right ? c.padIn : c.padOut,
  }
}

// Avatar ring: gold on the server, white on the receiver, a light team colour otherwise.
function ringColor(color: string, serving: boolean, receiving: boolean) {
  if (serving) return 'var(--color-serve)'
  if (receiving) return '#FFFFFF'
  return `color-mix(in srgb, ${color} 60%, white)`
}

// An initials avatar on the court's outer side, overlapping a name pill in the team colour that
// runs towards the net. The right half is the mirror image.
export function PlayerChip({ player, size = 'md', half, color, serving, receiving, crowned, pillRef, onClick }: PlayerChipProps) {
  const { name } = player
  const c = CHIP[size]
  const right = half === 'right'
  // Players show their avatar colour; old snapshots without one stay white, since grey looks
  // washed out against the court.
  const avatar = player.color ? avatarColors(player) : { bg: '#FFFFFF', fg: 'var(--color-ink)' }
  return (
    <div className={`relative flex max-w-full min-w-0 items-center ${right ? 'flex-row-reverse' : ''}`}>
      <button
        type="button"
        onClick={onClick}
        disabled={!onClick}
        aria-label={name}
        title={name}
        className={`flex max-w-full min-w-0 items-center enabled:active:opacity-80 ${right ? 'flex-row-reverse' : ''}`}
      >
        <span
          aria-hidden
          className="relative z-[1] flex shrink-0 items-center justify-center rounded-full font-extrabold"
          style={{
            width: c.avatar,
            height: c.avatar,
            borderWidth: c.ring,
            fontSize: player.color ? c.initials : c.initials - 1,
            backgroundColor: avatar.bg,
            color: avatar.fg,
            borderColor: ringColor(color, serving, receiving),
          }}
        >
          {initials(name)}
        </span>
        {/* Tucks under the avatar; long names are cut off with an ellipsis. */}
        <span
          ref={pillRef}
          aria-hidden
          className={`min-w-0 truncate font-extrabold text-white ${right ? 'rounded-l-full' : 'rounded-r-full'}`}
          style={{ backgroundColor: color, maxWidth: c.maxPill, ...pillStyle(c, right) }}
        >
          {name}
        </span>
      </button>
      {/* Worn on the avatar's outer top corner. */}
      {crowned && (
        <Crown
          className={`absolute -top-3.5 z-[2] ${right ? '-right-1.5 rotate-[18deg]' : '-left-1.5 -rotate-[18deg]'}`}
        />
      )}
      {/* Right after the pill, on the net side. */}
      {serving && (
        <Shuttle
          className={`shrink-0 ${size === 'lg' ? `h-[35px] w-[27px] ${right ? 'mr-1.5' : 'ml-1.5'}` : right ? 'mr-1' : 'ml-1'}`}
        />
      )}
    </div>
  )
}

// An empty spot: a dashed avatar in the team colour with a +, and a dashed "Tap to pick" pill.
// It sits above the court's dark overlay. Read-only courts show it without the tap.
function EmptyChip({
  size = 'md',
  half,
  color,
  teamName,
  raised,
  onClick,
}: {
  size?: ChipSize
  half: SideKey
  color: string
  teamName: string
  // Above the court's dark layer (only when the empty spot is what needs a tap).
  raised: boolean
  onClick?: () => void
}) {
  const right = half === 'right'
  const c = CHIP[size]
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      aria-label={`Empty Team ${teamName.charAt(0).toUpperCase() + teamName.slice(1)} spot. Tap to pick a player`}
      className={`relative flex max-w-full ${raised ? 'z-[6]' : ''} min-w-0 items-center enabled:active:opacity-80 ${right ? 'flex-row-reverse' : ''}`}
    >
      <span
        aria-hidden
        className="relative z-[1] flex shrink-0 items-center justify-center rounded-full border-[2.5px] border-dashed border-white text-white"
        style={{ width: c.avatar, height: c.avatar, backgroundColor: color }}
      >
        <PlusIcon size={c.plus} />
      </span>
      <span
        aria-hidden
        className={`truncate border-[1.5px] border-dashed border-white/85 bg-white/[0.18] font-extrabold whitespace-nowrap text-white ${
          right ? 'rounded-l-full border-r-0' : 'rounded-r-full border-l-0'
        }`}
        style={{ ...pillStyle(c, right), lineHeight: `${c.pill - 3}px` }}
      >
        Tap to pick
      </span>
    </button>
  )
}
