import { Fragment, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { avatarColors, initials } from './avatarStyle'
import {
  EMPTY_SLOT,
  hasEmptySlot,
  receiverId,
  screenRow,
  serverId,
  sideOf,
  TEAM_IDS,
  teamOn,
  type CourtState,
  type SideKey,
} from './game'
import { DeuceRing, GamePointHalf } from './CourtIndicators'
import { EyeIcon, PlusIcon, RotateIcon, SwapArrowsIcon, SwapIcon } from '../../components/ui/icons'
import { RefereeChair, Shuttle } from './icons'
import { MOTION, type FlipPhase } from './motion'
import { usePrefersReducedMotion } from '../../components/ui/overlay'
import { TEAM_COLORS, TEAM_TINTS, type Config, type CourtView, type Player, type TeamColor, type TeamId } from './schema'
import { viewRow, viewSide } from './view'
import { useCourtMotion, type CourtMotion } from './useCourtMotion'

type CourtProps = {
  court: CourtState
  byId: Map<string, Player>
  colors: Config['teamColors']
  // Omit for a read-only court (e.g. a past rally): chips can't be tapped.
  onPick?: (team: TeamId, slot: number) => void
  // Omit to hide the partner-swap buttons; shown on each half that has two players.
  onSwapPartners?: (team: TeamId) => void
  // "Swap sides" on the net post (any time), and before the first rally the server's shuttle
  // becomes a "Change server" button. Not shown while the court is covered or has an empty spot.
  onSwapSides?: () => void
  onChangeServer?: () => void
  // Optional row of controls above the court.
  top?: ReactNode
  // Covers the whole court with a dark layer holding this content (e.g. "Pick players").
  overlay?: ReactNode
  // 'lg': bigger chips for the tablet's Court preview.
  size?: ChipSize
  // Game point: that team's half gets a stroke with an inward wave (it follows the team when
  // ends swap). Deuce: a gradient ring around the card. Both from the score, on one beat.
  gamePoint?: TeamId | null
  deuce?: boolean
  // Laid over the court card (the game point toast, which dims the card itself).
  toast?: ReactNode
  // Referee view (as seen from the chair) or Facing referee (turned 180°). A view only.
  view?: CourtView
  // The card-flip animation while the view changes (from useViewFlip).
  flip?: FlipPhase
  // Omit for a read-only court: the view shows as a label instead of a toggle.
  onFlipView?: () => void
  // The view the chip shows: the chosen one, right away (the card itself switches when it is
  // edge-on). Defaults to `view`.
  chipView?: CourtView
  // A forward action that just happened (a point), to play its feedback. Undo/Redo never send one.
  motion?: CourtMotion | null
  // Pick players' mini court: every slot is a button (onPick), the active one (the slot the next
  // pick fills) has a breathing white halo, empty ones read "Pick next" / "Empty". No server
  // ring, shuttle or serve line, no dimming and no controls.
  picking?: { active: { team: TeamId; slot: number }; label: (team: TeamId, slot: number) => string }
  // false: no view chip under the court (Pick players has its own next to the search).
  viewChip?: boolean
  // false: empty spots stay quiet with no dim (the tablet Court preview during Next up, where
  // the Next up card is the action). Players missing mid-game: true.
  spotlight?: boolean
}

type Cell = { team: TeamId; slot: number; id: string }
type Line = { x1: number; y1: number; x2: number; y2: number }

export function Court({
  court,
  byId,
  colors,
  onPick,
  onSwapPartners,
  onSwapSides,
  onChangeServer,
  top,
  overlay,
  size = 'md',
  gamePoint,
  deuce = false,
  toast,
  view = 'referee',
  flip = null,
  onFlipView,
  chipView = view,
  motion,
  picking,
  viewChip = true,
  spotlight: canSpotlight = true,
}: CourtProps) {
  const chip = CHIP[size]
  const radius = size === 'lg' ? 24 : 18
  const avatarLine = CHIP_INSET + chip.avatar / 2
  const server = serverId(court)
  const receiver = receiverId(court)
  // An empty spot darkens the court so the "Tap to pick" chip is all that stands out.
  // An overlay covers it all instead.
  const dimmed = !!onPick && !overlay && !picking && canSpotlight && hasEmptySlot(court)
  const controls = !overlay && !picking && !hasEmptySlot(court)
  const isActive = (cell: Cell) => picking?.active.team === cell.team && picking.active.slot === cell.slot

  // Place each player in a quadrant of the screen (turned 180° when Facing referee).
  const halfOf = (team: TeamId) => viewSide(sideOf(court, team), view)
  const cells = new Map<string, Cell>()
  for (const team of TEAM_IDS) {
    court.teams[team].ids.forEach((id, slot) => {
      cells.set(`${halfOf(team)}-${viewRow(screenRow(court, team, slot), view)}`, { team, slot, id })
    })
  }

  // The spotlight (players missing mid-game): one empty spot is the active one to tap, the first
  // in screen order (top-left, bottom-left, top-right, bottom-right); the rest stay quiet.
  const spotlight = dimmed
    ? (['left-top', 'left-bottom', 'right-top', 'right-bottom'].map((k) => cells.get(k)).find((c) => c?.id === EMPTY_SLOT) ?? null)
    : null

  // The serve line runs from the middle of the server's shuttle to the net-facing end of the
  // receiver's name pill (at its vertical middle), measured from the DOM so it follows the real
  // layout. Layout offsets, not screen boxes: transforms (a dialog scaling in, the card flipping,
  // chips moving) never skew it.
  const courtRef = useRef<HTMLDivElement>(null)
  // Per player: the name pill (serve line end), the avatar, and the whole chip (what moves).
  const chipRefs = useRef(new Map<string, HTMLElement>())
  const avatarRefs = useRef(new Map<string, HTMLElement>())
  const rowRefs = useRef(new Map<string, HTMLElement>())
  const shuttleRef = useRef<HTMLElement | null>(null)
  const flashRef = useRef<HTMLDivElement>(null)
  const lineMaskRef = useRef<SVGLineElement>(null)
  const maskId = useId()
  const [line, setLine] = useState<Line | null>(null)

  useLayoutEffect(() => {
    const container = courtRef.current
    if (!container) return
    const measure = () => {
      const from = shuttleRef.current
      const to = chipRefs.current.get(receiver)
      if (!from || !to) return setLine(null)
      const a = boxIn(from, container)
      const b = boxIn(to, container)
      // A pill left of the net faces it with its right end, and vice versa.
      const leftOfNet = b.x + b.w / 2 < container.clientWidth / 2
      const start = { x1: a.x + a.w / 2, y1: a.y + a.h / 2 }
      const end = { x2: leftOfNet ? b.x + b.w : b.x, y2: b.y + b.h / 2 }
      // Long names leave under ~40px between the shuttle and the pill: end at the receiver's
      // avatar edge instead, so the line never disappears.
      const avatar = avatarRefs.current.get(receiver)
      if (avatar && Math.hypot(end.x2 - start.x1, end.y2 - start.y1) < 40) {
        const v = boxIn(avatar, container)
        end.x2 = leftOfNet ? v.x + v.w : v.x
        end.y2 = v.y + v.h / 2
      }
      setLine({ ...start, ...end })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(container)
    return () => observer.disconnect()
  }, [court, server, receiver, onChangeServer, view])

  const swapButtonRefs = useRef(new Map<string, HTMLElement>())
  const setSwapButton = (key: string) => (el: HTMLElement | null) => {
    if (el) swapButtonRefs.current.set(key, el)
    else swapButtonRefs.current.delete(key)
  }
  useCourtMotion(
    {
      container: courtRef,
      chips: rowRefs,
      avatars: avatarRefs,
      pills: chipRefs,
      shuttle: shuttleRef,
      swapButtons: swapButtonRefs,
      flash: flashRef,
      lineMask: lineMaskRef,
    },
    motion,
    { court, view, server, receiver },
  )
  // The flash shows on the half the team scored from: on a point that also changed ends, that's
  // the other half from where they are now.
  const flashHalf =
    motion?.kind === 'point' ? (motion.swap ? (halfOf(motion.team) === 'left' ? 'right' : 'left') : halfOf(motion.team)) : null

  return (
    <div className="shrink-0">
      {top && <div className="mb-2">{top}</div>}
      {/* Isolated, so the deuce ring can sit behind the card; the flip turns both. */}
      <div className={`relative isolate ${flip === 'out' ? 'view-flip-out' : flip === 'in' ? 'view-flip-in' : ''}`}>
      {deuce && !overlay && (
        <DeuceRing
          left={TEAM_COLORS[colors[teamOn(court, viewSide('left', view))]]}
          right={TEAM_COLORS[colors[teamOn(court, viewSide('right', view))]]}
          radius={radius}
        />
      )}
      <div className={`relative bg-court ${size === 'lg' ? 'rounded-[24px] p-3.5' : 'rounded-card p-2.5'}`}>
        <div
          ref={courtRef}
          className="relative grid aspect-[342/176] grid-cols-2 grid-rows-2 border-2 border-white bg-court-inner"
        >
          {/* Short service lines and centre lines, dimmed so only the outline and the net (down
              the middle) stay bright. */}
          <div className="absolute inset-y-0 left-[35%] w-0.5 bg-white/30" />
          <div className="absolute inset-y-0 left-[65%] w-0.5 bg-white/30" />
          <div className="absolute top-1/2 left-0 h-0.5 w-[35%] bg-white/30" />
          <div className="absolute top-1/2 right-0 h-0.5 w-[35%] bg-white/30" />
          <div className="absolute -inset-y-1.5 left-1/2 w-1 -translate-x-1/2 rounded-sm bg-white" />

          {/* Point feedback: the scoring team's half, a quick tint (opacity 0 at rest). */}
          {motion?.kind === 'point' && (
            <div
              ref={flashRef}
              aria-hidden
              className={`pointer-events-none absolute inset-y-0 w-1/2 opacity-0 ${flashHalf === 'left' ? 'left-0' : 'right-0'}`}
              style={{ backgroundColor: TEAM_COLORS[colors[motion.team]] }}
            />
          )}

          {/* Serve direction: drawn before the chips so they sit on top of it. The mask stroke
              (dash offset 0 at rest) lets the line grow out of the shuttle after a point. */}
          {line && !picking && (
            <svg className="pointer-events-none absolute inset-0 size-full overflow-visible" aria-hidden>
              <mask id={maskId} maskUnits="userSpaceOnUse" x="-50%" y="-50%" width="200%" height="200%">
                <line
                  ref={lineMaskRef}
                  {...line}
                  stroke="#FFFFFF"
                  strokeWidth={12}
                  strokeLinecap="round"
                  pathLength={1}
                  strokeDasharray="1 1"
                />
              </mask>
              <line
                {...line}
                mask={`url(#${CSS.escape(maskId)})`}
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
                      size={size}
                      half={half}
                      teamColor={colors[cell.team]}
                      onClick={onPick && (() => onPick(cell.team, cell.slot))}
                      // Active: the next pick in Pick players, or the spotlight's spot (above the
                      // dim). Quiet: everything else, including spots under the Next up overlay.
                      active={picking ? isActive(cell) : cell === spotlight}
                      label={picking ? 'Pick next' : 'Tap to pick'}
                      ariaLabel={picking?.label(cell.team, cell.slot)}
                      pressed={picking ? isActive(cell) : undefined}
                    />
                  )}
                  {cell && cell.id !== EMPTY_SLOT && (
                    <PlayerChip
                      player={byId.get(cell.id) ?? { name: '?' }}
                      size={size}
                      half={half}
                      color={TEAM_COLORS[colors[cell.team]]}
                      serving={!picking && cell.id === server}
                      receiving={!picking && cell.id === receiver}
                      pick={picking && { active: isActive(cell), label: picking.label(cell.team, cell.slot) }}
                      onChangeServer={controls ? onChangeServer : undefined}
                      shuttleRef={
                        cell.id === server
                          ? (el) => {
                              shuttleRef.current = el
                            }
                          : undefined
                      }
                      pillRef={(el) => {
                        if (el) chipRefs.current.set(cell.id, el)
                        else chipRefs.current.delete(cell.id)
                      }}
                      avatarRef={(el) => {
                        if (el) avatarRefs.current.set(cell.id, el)
                        else avatarRefs.current.delete(cell.id)
                      }}
                      rootRef={(el) => {
                        if (el) rowRefs.current.set(cell.id, el)
                        else rowRefs.current.delete(cell.id)
                      }}
                      onClick={onPick && (() => onPick(cell.team, cell.slot))}
                    />
                  )}
                </div>
              )
            }),
          )}

          {/* Swap sides: on the top net post, half outside the court so it covers no play area.
              The visible circle is 40px (52px on the big court); the button is at least 44px.
              Above the game point glow and dim (z-20), so they never cover it. */}
          {onSwapSides && controls && (
            <button
              type="button"
              onClick={onSwapSides}
              aria-label="Swap sides"
              title="Swap sides"
              className={`group absolute left-1/2 z-20 flex -translate-x-1/2 items-center justify-center ${size === 'lg' ? '-top-[30px] size-[52px]' : '-top-6 size-11'}`}
            >
              <span
                className={`flex items-center justify-center rounded-full border-court bg-white text-ink group-active:opacity-80 ${size === 'lg' ? 'size-[52px] border-4' : 'size-10 border-[3px]'}`}
              >
                <SwapArrowsIcon size={size === 'lg' ? 24 : 18} />
              </span>
            </button>
          )}

          {/* Partner swap: on each outer edge, on the avatars' centre line, with a faint line from
              the bottom of the top avatar to the top of the bottom one and the button halfway
              along it. The 44px button is the tap area; the 32px circle is what shows. */}
          {onSwapPartners &&
            !dimmed &&
            !overlay &&
            TEAM_IDS.filter((team) => court.teams[team].ids.length === 2).map((team) => {
              const half = halfOf(team)
              const [first, second] = court.teams[team].ids.map((id) => byId.get(id)?.name ?? '?')
              const edge = half === 'left' ? 'left' : 'right'
              return (
                <Fragment key={team}>
                  <div
                    ref={setSwapButton(`${team}-line`)}
                    aria-hidden
                    className="absolute w-0.5 rounded-full bg-white/55"
                    style={{
                      [edge]: avatarLine - 1,
                      top: `calc(25% + ${chip.avatar / 2}px)`,
                      bottom: `calc(25% + ${chip.avatar / 2}px)`,
                    }}
                  />
                  <button
                    ref={setSwapButton(team)}
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
        {gamePoint && !overlay && (
          <GamePointHalf side={halfOf(gamePoint)} color={TEAM_COLORS[colors[gamePoint]]} radius={radius} />
        )}
        {toast}
      </div>
      </div>
      {/* Referee view: drawn from the chair at the bottom, at the net, facing the court, so
          screen left is the scorer's left. Facing referee: turned 180° for a scorer sitting
          opposite the chair. The chip says which, and flips it. */}
      {viewChip && (
        <div className="flex h-14 items-center justify-center">
          <ViewChip view={chipView} size={size} onFlip={onFlipView} />
        </div>
      )}
    </div>
  )
}

// Where an element's layout box sits inside the court (from inside its white border, where the
// serve line's SVG starts). Ignores transforms.
function boxIn(el: HTMLElement, container: HTMLElement) {
  let x = 0
  let y = 0
  let node: HTMLElement | null = el
  while (node && node !== container) {
    x += node.offsetLeft
    y += node.offsetTop
    node = node.offsetParent as HTMLElement | null
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight }
}

const VIEW_LABEL: Record<CourtView, string> = { referee: 'Referee view', facing: 'Facing referee' }
const VIEWS = ['referee', 'facing'] as const

// "[icon] label | ↻": white with the referee chair in Referee view, blue with an eye while
// Facing referee. 'md' under the phone court, 'lg' under the tablet's Court preview, 'xl' in the
// tablet's top row. Without onFlip it is a plain label (read-only courts).
//
// Both looks are drawn as faces stacked in one grid cell, each holding both labels (the other
// one invisible), so the chip is the same width in either state and never shifts. On a flip the
// faces cross-fade with a small squeeze at the midpoint, on the court flip's beat; aria-pressed
// and the label change at once, the animation is only visual.
// 'search': Pick players' chip beside the search field, 44px tall with no ↻ part, to save width.
export function ViewChip({
  view,
  size = 'md',
  onFlip,
}: {
  view: CourtView
  size?: ChipSize | 'xl' | 'search'
  onFlip?: () => void
}) {
  const big = size === 'lg' || size === 'xl'
  const reduced = usePrefersReducedMotion()
  const chipRef = useRef<HTMLElement>(null)
  const faceRefs = useRef(new Map<CourtView, HTMLElement>())
  const previous = useRef(view)

  useLayoutEffect(() => {
    if (previous.current === view) return
    const old = previous.current
    previous.current = view
    if (reduced) return
    const timing = { duration: MOTION.flip, easing: 'linear' }
    // Offsets match the mockup: the fade runs across the middle of the flip, the squeeze peaks
    // when the court is edge-on.
    const animations = [
      chipRef.current?.animate([{ transform: 'scale(1)' }, { transform: 'scale(0.92)', offset: 0.5 }, { transform: 'scale(1)' }], {
        duration: MOTION.flip,
        easing: MOTION.ease,
      }),
      faceRefs.current.get(old)?.animate(
        [{ opacity: 1 }, { opacity: 1, offset: 0.29 }, { opacity: 0.4, offset: 0.5 }, { opacity: 0, offset: 0.71 }, { opacity: 0 }],
        timing,
      ),
      faceRefs.current.get(view)?.animate(
        [{ opacity: 0 }, { opacity: 0, offset: 0.29 }, { opacity: 0.6, offset: 0.5 }, { opacity: 1, offset: 0.71 }, { opacity: 1 }],
        timing,
      ),
    ]
    return () => animations.forEach((a) => a?.cancel())
  }, [view, reduced])

  const icon = (v: CourtView) =>
    v === 'facing' ? (
      <span className={`flex shrink-0 justify-center ${big ? 'w-[34px]' : 'w-[30px]'}`}>
        <EyeIcon size={big ? 22 : 20} />
      </span>
    ) : (
      <RefereeChair className={`shrink-0 ${big ? 'h-[22px] w-[34px]' : 'h-5 w-[30px]'}`} />
    )
  const labels = (v: CourtView) => (
    <span className="grid">
      {VIEWS.map((l) => (
        <span key={l} className={`col-start-1 row-start-1 ${l === v ? '' : 'invisible'}`}>
          {VIEW_LABEL[l]}
        </span>
      ))}
    </span>
  )
  const face = (v: CourtView) =>
    `col-start-1 row-start-1 flex items-center rounded-full border-[1.5px] ${
      v === 'facing' ? 'border-[#2268A6] bg-[#E6EDFB] text-[#1F5F99]' : 'border-[#D3D8E1] bg-white text-[#5A6478]'
    } ${
      size === 'xl'
        ? 'h-[52px] gap-2.5 pr-3.5 pl-2'
        : size === 'lg'
          ? 'h-[42px] gap-2.5 pr-3.5 pl-2'
          : size === 'search'
            ? 'h-11 gap-2 pr-3.5 pl-1.5'
            : 'h-9 gap-2 pr-3 pl-1.5'
    }`
  const text = `shrink-0 font-bold ${big ? 'text-[15px]' : 'text-[13px]'}`

  if (!onFlip) {
    return (
      <span className={`grid ${text}`}>
        <span className={face(view)}>
          {icon(view)}
          {labels(view)}
        </span>
      </span>
    )
  }
  return (
    <button
      ref={(el) => {
        chipRef.current = el
      }}
      type="button"
      onClick={onFlip}
      aria-pressed={view === 'facing'}
      aria-label={`View: ${VIEW_LABEL[view]}. Tap to flip`}
      className={`grid active:opacity-80 ${text}`}
    >
      {VIEWS.map((v) => (
        <span
          key={v}
          aria-hidden
          ref={(el) => {
            if (el) faceRefs.current.set(v, el)
            else faceRefs.current.delete(v)
          }}
          className={`${face(v)} ${v === view ? '' : 'opacity-0'}`}
        >
          {icon(v)}
          {labels(v)}
          {size !== 'search' && (
            <>
              <span className={`w-[1.5px] shrink-0 bg-[#D3D8E1] ${big ? 'h-[18px]' : 'h-4'}`} />
              <RotateIcon size={big ? 17 : 15} />
            </>
          )}
        </span>
      ))}
    </button>
  )
}

type PlayerChipProps = {
  player: Pick<Player, 'name' | 'color'>
  size?: ChipSize
  half: SideKey
  color: string
  serving: boolean
  receiving: boolean
  // Gets the name pill, whose net-facing end anchors the serve line.
  pillRef?: (el: HTMLSpanElement | null) => void
  // Gets the shuttle (or the Change server button around it), where the serve line starts.
  shuttleRef?: (el: HTMLElement | null) => void
  // Get the avatar (positions, the ring pop) and the whole chip (what moves).
  avatarRef?: (el: HTMLSpanElement | null) => void
  rootRef?: (el: HTMLDivElement | null) => void
  onClick?: () => void
  // Before the first rally the server's shuttle is a "Change server" button.
  onChangeServer?: () => void
  // Pick players: the slot's label, and whether it's the active one (white halo + pill outline).
  pick?: SlotPick
}

// A Pick players slot: whether the next pick fills it, and its button label.
type SlotPick = { active: boolean; label: string }

// Chip geometry: an avatar circle inset 6px from the court's outer edge, and a name pill that
// tucks `tuck` px under it. The partner swap button and its line sit on the avatars' centre line.
type ChipSize = 'md' | 'lg'
const CHIP_INSET = 6
const CHIP = {
  md: { avatar: 50, ring: 3, initials: 15, pill: 30, text: 13, maxPill: 116, tuck: 14, padIn: 20, padOut: 12, plus: 16, quiet: 16 },
  lg: { avatar: 68, ring: 4, initials: 20, pill: 40, text: 18, maxPill: 157, tuck: 19, padIn: 27, padOut: 16, plus: 22, quiet: 22 },
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

// Avatar ring: green with a white halo on the server, white on the receiver, a light team
// colour otherwise. (Gold now means "winner"; the serve line and shuttle button stay gold.)
const SERVER_RING = '#23964F'
function ringColor(color: string, serving: boolean, receiving: boolean) {
  if (serving) return SERVER_RING
  if (receiving) return '#FFFFFF'
  return `color-mix(in srgb, ${color} 60%, white)`
}

// An initials avatar on the court's outer side, overlapping a name pill in the team colour that
// runs towards the net. The right half is the mirror image.
export function PlayerChip({
  player,
  size = 'md',
  half,
  color,
  serving,
  receiving,
  pillRef,
  shuttleRef,
  avatarRef,
  rootRef,
  onClick,
  onChangeServer,
  pick,
}: PlayerChipProps) {
  const { name } = player
  const c = CHIP[size]
  const right = half === 'right'
  // Players show their avatar colour; old snapshots without one stay white, since grey looks
  // washed out against the court.
  const avatar = player.color ? avatarColors(player) : { bg: '#FFFFFF', fg: 'var(--color-ink)' }
  return (
    <div ref={rootRef} className={`relative flex max-w-full min-w-0 items-center ${right ? 'flex-row-reverse' : ''}`}>
      <button
        type="button"
        onClick={onClick}
        disabled={!onClick}
        aria-label={pick?.label ?? name}
        aria-pressed={pick ? pick.active : undefined}
        title={name}
        className={`flex max-w-full min-w-0 items-center enabled:active:opacity-80 ${right ? 'flex-row-reverse' : ''}`}
      >
        <span
          ref={avatarRef}
          data-part="avatar"
          aria-hidden
          className={`relative z-[1] flex shrink-0 items-center justify-center rounded-full font-extrabold ${pick?.active ? 'pick-halo' : ''}`}
          style={{
            width: c.avatar,
            height: c.avatar,
            borderWidth: c.ring,
            fontSize: player.color ? c.initials : c.initials - 1,
            backgroundColor: avatar.bg,
            color: avatar.fg,
            borderColor: ringColor(color, serving, receiving),
            boxShadow: serving ? '0 0 0 3px #FFFFFF' : undefined,
          }}
        >
          {initials(name)}
        </span>
        {/* Tucks under the avatar; long names are cut off with an ellipsis. */}
        <span
          ref={pillRef}
          data-part="pill"
          aria-hidden
          className={`min-w-0 truncate font-extrabold text-white ${right ? 'rounded-l-full' : 'rounded-r-full'} ${
            pick?.active ? 'shadow-[inset_0_0_0_2px_#FFFFFF]' : ''
          }`}
          style={{ backgroundColor: color, maxWidth: c.maxPill, ...pillStyle(c, right) }}
        >
          {name}
        </span>
      </button>
      {/* Right after the pill, on the net side. */}
      {serving && onChangeServer && (
        <button
          ref={shuttleRef}
          data-part="shuttle"
          type="button"
          onClick={onChangeServer}
          aria-label="Change server"
          title="Change server"
          className={`relative flex shrink-0 items-center justify-center rounded-full border-2 border-serve bg-[rgba(20,26,38,0.35)] active:opacity-80 ${
            size === 'lg' ? `size-[54px] ${right ? 'mr-2' : 'ml-2'}` : `size-10 ${right ? 'mr-1.5' : 'ml-1.5'}`
          }`}
        >
          <Shuttle className={`shrink-0 ${size === 'lg' ? 'h-[35px] w-[27px]' : ''}`} />
          <span
            className={`absolute -right-1.5 -bottom-1.5 flex items-center justify-center rounded-full bg-white text-ink shadow-[0_1px_3px_rgba(0,0,0,0.3)] ${size === 'lg' ? 'size-[22px]' : 'size-5'}`}
          >
            <SwapArrowsIcon size={12} strokeWidth={2.8} />
          </span>
        </button>
      )}
      {/* During play the same circle, without the badge and not tappable. */}
      {serving && !onChangeServer && (
        <span
          ref={shuttleRef}
          data-part="shuttle"
          className={`flex shrink-0 items-center justify-center rounded-full border-2 border-serve bg-[rgba(20,26,38,0.35)] ${
            size === 'lg' ? `size-[54px] ${right ? 'mr-2' : 'ml-2'}` : `size-10 ${right ? 'mr-1.5' : 'ml-1.5'}`
          }`}
        >
          <Shuttle className={`shrink-0 ${size === 'lg' ? 'h-[35px] w-[27px]' : ''}`} />
        </span>
      )}
    </div>
  )
}

// An empty spot, one piece for the scoreboard and Pick players, in two states:
// - quiet (waiting, not the target, or under an overlay): a small faint ring where the avatar
//   would be, in the same 50px tap area; no pill, label, animation or team colour;
// - active (the one spot to tap): an opaque light-green disc with a white +, the breathing white
//   halo, and a solid white pill tucked under it with the label in the team's dark colour. On
//   the scoreboard it sits above the spotlight dim.
function EmptyChip({
  size = 'md',
  half,
  teamColor,
  active,
  label,
  ariaLabel,
  pressed,
  onClick,
}: {
  size?: ChipSize
  half: SideKey
  teamColor: TeamColor
  active: boolean
  // "Tap to pick" (scoreboard) or "Pick next" (Pick players).
  label: string
  // Defaults to the scoreboard's "Empty Team Blue spot. Tap to pick a player".
  ariaLabel?: string
  // Pick players: slots are toggle buttons (the active one pressed).
  pressed?: boolean
  onClick?: () => void
}) {
  const right = half === 'right'
  const c = CHIP[size]
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      aria-label={ariaLabel ?? `Empty Team ${teamColor.charAt(0).toUpperCase() + teamColor.slice(1)} spot. Tap to pick a player`}
      aria-pressed={pressed}
      className={`relative flex max-w-full min-w-0 items-center enabled:active:opacity-80 ${active ? 'z-[6]' : ''} ${right ? 'flex-row-reverse' : ''}`}
    >
      {active ? (
        <>
          <span
            aria-hidden
            className={`relative z-[1] flex shrink-0 items-center justify-center rounded-full bg-[#79AD8E] text-white ${onClick ? 'pick-halo' : ''}`}
            style={{ width: c.avatar, height: c.avatar }}
          >
            <PlusIcon size={c.plus} strokeWidth={2.8} />
          </span>
          <span
            aria-hidden
            className={`truncate bg-white font-extrabold whitespace-nowrap ${right ? 'rounded-l-full' : 'rounded-r-full'}`}
            style={{ ...pillStyle(c, right), color: TEAM_TINTS[teamColor].fg }}
          >
            {label}
          </span>
        </>
      ) : (
        <span aria-hidden className="flex shrink-0 items-center justify-center" style={{ width: c.avatar, height: c.avatar }}>
          <span
            className="rounded-full border-2 border-white/55 bg-white/12"
            style={{ width: c.quiet, height: c.quiet }}
          />
        </span>
      )}
    </button>
  )
}
