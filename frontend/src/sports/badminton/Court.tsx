import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { initials } from './initials'
import { receiverId, screenRow, serverId, sideOf, TEAM_IDS, type CourtState, type SideKey } from './game'
import { Crown, RefereeChair, Shuttle } from './icons'
import { TEAM_COLORS, type Config, type Player, type TeamId } from './schema'

type CourtProps = {
  court: CourtState
  byId: Map<string, Player>
  colors: Config['teamColors']
  // Omit for a read-only court (e.g. a past rally): chips can't be tapped.
  onPick?: (team: TeamId, slot: number) => void
  // Players of this team wear the crown.
  crownedTeam?: TeamId
  // Optional row of controls above the court (e.g. mode switch, switch sides/serve).
  top?: ReactNode
}

type Cell = { team: TeamId; slot: number; id: string }
type Line = { x1: number; y1: number; x2: number; y2: number }

export function Court({ court, byId, colors, onPick, crownedTeam, top }: CourtProps) {
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

  // The serve line joins the net-facing edges of the server's and receiver's chips
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
        // A chip left of the net faces it with its right edge, and vice versa.
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
                  className={`relative flex items-center p-2 ${half === 'left' ? 'col-start-1 justify-start' : 'col-start-2 justify-end'} ${row === 'top' ? 'row-start-1' : 'row-start-2'}`}
                >
                  {cell && (
                    <PlayerChip
                      name={byId.get(cell.id)?.name ?? '?'}
                      half={half}
                      color={TEAM_COLORS[colors[cell.team]]}
                      serving={cell.id === server}
                      receiving={cell.id === receiver}
                      crowned={cell.team === crownedTeam}
                      chipRef={(el) => {
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
  name: string
  half: SideKey
  color: string
  serving: boolean
  receiving: boolean
  crowned: boolean
  chipRef: (el: HTMLButtonElement | null) => void
  onClick?: () => void
}

// Ring: yellow on the server, solid white on the receiver, faint white otherwise.
function ringColor(serving: boolean, receiving: boolean) {
  if (serving) return 'var(--color-serve)'
  if (receiving) return '#FFFFFF'
  return 'rgba(255,255,255,0.35)'
}

function PlayerChip({ name, half, color, serving, receiving, crowned, chipRef, onClick }: PlayerChipProps) {
  // The shuttle sits on the side facing the net (the middle of the screen).
  return (
    <div className={`relative flex max-w-full items-center gap-1 ${half === 'right' ? 'flex-row-reverse' : ''}`}>
      <button
        ref={chipRef}
        type="button"
        onClick={onClick}
        disabled={!onClick}
        style={{ backgroundColor: color, borderColor: ringColor(serving, receiving) }}
        // As wide as the name; very long names are truncated to fit the quarter court.
        className={`flex h-[34px] max-w-full min-w-0 items-center gap-1.5 rounded-full border-[3px] text-[13px] font-bold text-white enabled:active:opacity-80 ${half === 'right' ? 'flex-row-reverse pr-[3px] pl-3' : 'pr-3 pl-[3px]'}`}
      >
        <span className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-white text-[11px] text-ink">
          {initials(name)}
        </span>
        <span className="truncate">{name}</span>
      </button>
      {/* Worn on the avatar side of the chip: top-left on the left half, top-right on the right. */}
      {crowned && (
        <Crown
          className={`absolute -top-3.5 ${half === 'left' ? '-left-1.5 -rotate-[18deg]' : '-right-1.5 rotate-[18deg]'}`}
        />
      )}
      {serving && <Shuttle className="shrink-0" />}
    </div>
  )
}
