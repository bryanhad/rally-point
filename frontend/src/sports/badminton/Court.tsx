import { Fragment, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { avatarColors, initials } from './avatarStyle'
import { receiverId, screenRow, serverId, sideOf, TEAM_IDS, type CourtState, type SideKey } from './game'
import { SwapIcon } from '../../components/ui/icons'
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
}

type Cell = { team: TeamId; slot: number; id: string }
type Line = { x1: number; y1: number; x2: number; y2: number }

export function Court({ court, byId, colors, onPick, onSwapPartners, crownedTeam, top }: CourtProps) {
  const server = serverId(court)
  const receiver = receiverId(court)

  // Place each player in a quadrant of the screen.
  const cells = new Map<string, Cell>()
  for (const team of TEAM_IDS) {
    const half = sideOf(court, team)
    court.teams[team].ids.forEach((id, slot) => {
      cells.set(`${half}-${screenRow(court, team, slot)}`, { team, slot, id })
    })
  }

  // The serve line joins the net-facing ends of the server's and receiver's name pills
  // (at their vertical middle), measured from the DOM so it follows the real layout.
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
      const netEdge = (el: HTMLElement) => {
        const r = el.getBoundingClientRect()
        // A pill left of the net faces it with its right end, and vice versa.
        const leftOfNet = r.left + r.width / 2 < box.left + box.width / 2
        return { x: (leftOfNet ? r.right : r.left) - box.left, y: r.top + r.height / 2 - box.top }
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
      <div className="rounded-card bg-court p-2.5">
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
                strokeWidth="2.5"
                strokeDasharray="3 6"
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
                  {cell && (
                    <PlayerChip
                      player={byId.get(cell.id) ?? { name: '?' }}
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
                      [edge]: AVATAR_LINE - 1,
                      top: `calc(25% + ${AVATAR_SIZE / 2}px)`,
                      bottom: `calc(25% + ${AVATAR_SIZE / 2}px)`,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => onSwapPartners(team)}
                    aria-label={`Swap ${first} and ${second}`}
                    title={`Swap ${first} and ${second}`}
                    className="group absolute top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center"
                    style={{ [edge]: AVATAR_LINE - 22 }}
                  >
                    <span
                      className="flex size-8 items-center justify-center rounded-full border-[2.5px] border-white text-white shadow-[0_1px_4px_rgba(14,18,26,0.25)] group-active:opacity-80"
                      style={{ backgroundColor: TEAM_COLORS[colors[team]] }}
                    >
                      <SwapIcon size={15} className="rotate-90" />
                    </span>
                  </button>
                </Fragment>
              )
            })}
        </div>
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
  half: SideKey
  color: string
  serving: boolean
  receiving: boolean
  crowned: boolean
  // Gets the name pill, whose net-facing end anchors the serve line.
  pillRef?: (el: HTMLSpanElement | null) => void
  onClick?: () => void
}

// Chip geometry: a 50px avatar circle, inset 6px from the court's outer edge. The partner swap
// button and its line sit on the avatars' centre line.
const CHIP_INSET = 6
const AVATAR_SIZE = 50
const AVATAR_LINE = CHIP_INSET + AVATAR_SIZE / 2

// Avatar ring: gold on the server, white on the receiver, a light team colour otherwise.
function ringColor(color: string, serving: boolean, receiving: boolean) {
  if (serving) return 'var(--color-serve)'
  if (receiving) return '#FFFFFF'
  return `color-mix(in srgb, ${color} 60%, white)`
}

// An initials avatar on the court's outer side, overlapping a name pill in the team colour that
// runs towards the net. The right half is the mirror image.
export function PlayerChip({ player, half, color, serving, receiving, crowned, pillRef, onClick }: PlayerChipProps) {
  const { name } = player
  const right = half === 'right'
  // Saved players show their avatar colour; defaults stay white, since grey looks washed out
  // against the court.
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
          className={`relative z-[1] flex shrink-0 items-center justify-center rounded-full border-[3px] font-extrabold ${player.color ? 'text-[15px]' : 'text-sm'}`}
          style={{
            width: AVATAR_SIZE,
            height: AVATAR_SIZE,
            backgroundColor: avatar.bg,
            color: avatar.fg,
            borderColor: ringColor(color, serving, receiving),
          }}
        >
          {initials(name)}
        </span>
        {/* Tucks 14px under the avatar; long names are cut off with an ellipsis. */}
        <span
          ref={pillRef}
          aria-hidden
          className={`h-[30px] min-w-0 max-w-[116px] truncate text-[13px] leading-[30px] font-extrabold text-white ${
            right ? '-mr-3.5 rounded-l-full pr-5 pl-3' : '-ml-3.5 rounded-r-full pr-3 pl-5'
          }`}
          style={{ backgroundColor: color }}
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
      {serving && <Shuttle className={`shrink-0 ${right ? 'mr-1' : 'ml-1'}`} />}
    </div>
  )
}
