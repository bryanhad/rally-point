import { useLayoutEffect, useRef, type RefObject } from 'react'
import { usePrefersReducedMotion } from '../../components/ui/overlay'
import { MOTION } from './motion'
import type { TeamId } from './schema'

// What just happened on the court, as told by the Scoreboard. Only forward actions animate, plus
// Undo of a move that moved players (played in reverse, faster). A new id is a new event; Redo,
// Reset and reload never send one, so they just show the end state (and stop anything playing).
export type CourtMotion = { id: number } & (
  // A scoring tap; `swap` when it also triggered the automatic change of ends.
  | { kind: 'point'; team: TeamId; swap: boolean }
  | { kind: 'swap-sides' }
  // ⇅ Swap positions, or picking a teammate in Change player.
  | { kind: 'swap-positions' }
  // Before rally 1: the serve goes to the other team.
  | { kind: 'change-server' }
  | { kind: 'change-player' }
  // Undo: `swapEnds` when the undone entry changed ends.
  | { kind: 'undo'; swapEnds: boolean }
)

export type CourtMotionRefs = {
  container: RefObject<HTMLElement | null>
  // Each player's chip (what moves), avatar (positions, ring pop) and name pill (tuck/unfurl).
  chips: RefObject<Map<string, HTMLElement>>
  avatars: RefObject<Map<string, HTMLElement>>
  pills: RefObject<Map<string, HTMLElement>>
  shuttle: RefObject<HTMLElement | null>
  // The team ⇅ buttons (and their faint lines), which fade out and back in on a side swap.
  swapButtons: RefObject<Map<string, HTMLElement>>
  // The scoring team's half tint, and the mask stroke that reveals the serve line.
  flash: RefObject<HTMLElement | null>
  lineMask: RefObject<SVGElement | null>
}

type Point = { x: number; y: number }
type Box = Point & { w: number; h: number }
// Per player: avatar centre, chip box, and a copy of the chip (for ghosts of the old state).
type Snapshot = {
  avatars: Map<string, Point>
  chips: Map<string, { box: Box; copy: HTMLElement }>
  shuttle: Point | null
  server: string
}

// Point feedback timeline (ms after the tap; the mockups' timings, tuned ~20% faster):
//   0      old serve line gone; the scoring half flashes (12% team tint, fading by ~400ms)
//   0–330  the shuttle hops in an arc to the new server (or, when the serving team scores
//          again, the pair slide past each other and the shuttle rides along)
//   330    landing: a small squash, and the server's green ring pops once
//   400–660 the serve line grows out of the shuttle towards the receiver (MOTION.point)
// ⇅ Swap positions and Change server play the same, without the flash.
const HOP = 330
const LINE_FROM = 400

// Swap sides (ms after its start), from the mockup:
//   0–216      the old names and the shuttle tuck into the avatars; the ⇅ buttons fade out
//   324–1170   the four players cross one at a time in straight lines (MOTION.swapEach each,
//              MOTION.swapStagger apart): server, receiver, server's partner, receiver's partner;
//              each lands with a small squash; a later starter passes underneath
//   1170–1386  the names unfurl, the shuttle pops back out, the ⇅ buttons fade back in
//   1386–1746  the serve line grows again from the shuttle
const SWAP_TUCK = 216
const SWAP_MOVE = 324
const SQUASH = 108
const UNFURL = 216
const LINE_GROW = 360

// Change player (ms): the old name tucks in and its avatar shrinks away, the new avatar pops in
// and its name unfurls. Nobody moves.
const OUT_PILL = 210
const OUT_AVATAR = { delay: 120, duration: 210 }
const IN_AVATAR = { delay: 300, duration: 360 }
const IN_PILL = { delay: 510, duration: 240 }

// A swap triggered by a point starts once the scoring half's flash has shown.
export const SWAP_AFTER_POINT = 300

// From the start of a swap until its last player has landed (the score buttons' slide starts
// with the first player), and until the serve line has grown back.
export const SWAP_FIRST_MOVE = SWAP_MOVE
export const swapSidesDuration = () => SWAP_MOVE + 3 * MOTION.swapStagger + MOTION.swapEach + UNFURL + LINE_GROW

export function useCourtMotion(
  refs: CourtMotionRefs,
  motion: CourtMotion | null | undefined,
  // Anything that moves chips: the court state and the view. Plus who serves and receives.
  deps: { court: unknown; view: unknown; server: string; receiver: string },
) {
  const reduced = usePrefersReducedMotion()
  const snapshot = useRef<Snapshot | null>(null)
  const handled = useRef<number | null>(motion?.id ?? null)
  const running = useRef<Animation[]>([])
  const ghosts = useRef<HTMLElement[]>([])

  useLayoutEffect(() => {
    const container = refs.container.current
    if (!container) return
    const before = snapshot.current
    const after = take(refs, container, deps.server)
    snapshot.current = after
    // Whatever was playing lands at its end: a new tap, an Undo, a swap.
    running.current.forEach((a) => a.finish())
    running.current = []
    ghosts.current.forEach((g) => g.remove())
    ghosts.current = []

    const fresh = motion && motion.id !== handled.current
    if (motion) handled.current = motion.id
    if (!fresh || !motion || reduced || !before) return

    const play = (el: Element | null | undefined, frames: Keyframe[], options: KeyframeAnimationOptions) => {
      if (!el) return null
      const animation = el.animate(frames, options)
      running.current.push(animation)
      return animation
    }
    // Raised while it animates, back to normal when it ends (or is cut short).
    const raise = (el: HTMLElement, animation: Animation | null, z: number) => {
      if (!animation) return
      el.style.zIndex = String(z)
      const done = () => {
        el.style.zIndex = ''
      }
      animation.onfinish = done
      animation.oncancel = done
    }
    const server = deps.server
    const leftHalf = (p: Point) => p.x < container.clientWidth / 2
    // A pill tucks into / unfurls from its avatar, which is on the court's outer edge.
    const pillOrigin = (p: Point) => (leftHalf(p) ? 'left center' : 'right center')
    const part = (root: Element | null, name: string) => root?.querySelector<HTMLElement>(`[data-part="${name}"]`) ?? null

    // A copy of a chip as it was, laid where it was, for things that leave (tucking names, a
    // replaced player). Removed when its job is done or anything new happens. `z`: above the
    // real chips (a replaced player leaving), or below them (names tucking in behind the avatar
    // that's about to move, which is raised while it animates).
    const ghost = (id: string, life: number, z: number) => {
      const old = before.chips.get(id)
      if (!old) return null
      const el = old.copy.cloneNode(true) as HTMLElement
      el.setAttribute('aria-hidden', 'true')
      el.setAttribute('inert', '')
      Object.assign(el.style, {
        position: 'absolute',
        left: `${old.box.x}px`,
        top: `${old.box.y}px`,
        width: `${old.box.w}px`,
        height: `${old.box.h}px`,
        margin: '0',
        zIndex: String(z),
        pointerEvents: 'none',
      })
      container.appendChild(el)
      ghosts.current.push(el)
      setTimeout(() => el.remove(), life)
      return el
    }

    const lineIn = (from: number, duration: number) =>
      play(
        refs.lineMask.current,
        [{ strokeDashoffset: 1 }, { strokeDashoffset: 1, offset: from / (from + duration) }, { strokeDashoffset: 0 }],
        { duration: from + duration, easing: 'ease-out' },
      )

    const ringPop = (delay: number) =>
      play(
        refs.avatars.current.get(server),
        [
          { transform: 'scale(1)', boxShadow: '0 0 0 3px #FFFFFF' },
          { transform: 'scale(1.14)', boxShadow: '0 0 0 3px #FFFFFF, 0 0 0 9px rgba(35, 150, 79, 0.35)', offset: 0.5 },
          { transform: 'scale(1)', boxShadow: '0 0 0 3px #FFFFFF, 0 0 0 9px rgba(35, 150, 79, 0)' },
        ],
        { duration: 240, delay, easing: 'ease-out' },
      )

    // Chips that moved (by their avatars, which the shuttle never shifts) slide straight to their
    // new place; the server stays on top and a partner on the same half dims as they cross. For
    // the serving pair trading courts, ⇅ swaps, singles court changes, and their Undo.
    const slideMoved = (duration: number) => {
      const serverTo = after.avatars.get(server)
      let serverShift = { x: 0, y: 0 }
      for (const [id, to] of after.avatars) {
        const from = before.avatars.get(id)
        const el = refs.chips.current.get(id)
        if (!from || !el || (from.x === to.x && from.y === to.y)) continue
        const isServer = id === server
        if (isServer) serverShift = { x: from.x - to.x, y: from.y - to.y }
        const partner = !isServer && !!serverTo && leftHalf(to) === leftHalf(serverTo)
        const animation = play(
          el,
          [
            { transform: `translate(${from.x - to.x}px, ${from.y - to.y}px)`, opacity: 1 },
            { opacity: partner ? 0.35 : 1, offset: 0.5 },
            { transform: 'none', opacity: 1 },
          ],
          { duration, easing: MOTION.ease },
        )
        raise(el, animation, isServer ? 3 : 2)
      }
      return serverShift
    }

    // The shuttle: an arc from the old server to the new one when the serve changed hands; a
    // small hop when it rides along with the server. Then the landing squash.
    const hopShuttle = (serverShift: Point) => {
      const shuttle = refs.shuttle.current
      if (!shuttle || !after.shuttle) return
      const towardNet = leftHalf(after.shuttle) ? 1 : -1
      const from = before.shuttle
      // The shuttle sits inside the server's chip: take off that chip's own slide (singles).
      const passes = before.server !== server && !!from
      const dx = passes && from ? from.x - after.shuttle.x - serverShift.x : 0
      const dy = passes && from ? from.y - after.shuttle.y - serverShift.y : 0
      const peak = passes
        ? `translate(${dx / 2}px, ${dy / 2 - 12}px) scale(1.18) rotate(-20deg)`
        : `translate(${6 * towardNet}px, -4px) scale(1.18) rotate(-20deg)`
      const total = HOP + 120
      play(
        shuttle,
        [
          { transform: `translate(${dx}px, ${dy}px)` },
          { transform: peak, offset: HOP / 2 / total, easing: 'ease-in' },
          { transform: 'none', offset: HOP / total },
          { transform: 'scale(0.9, 1.1)', offset: (HOP + 48) / total },
          { transform: 'none' },
        ],
        { duration: total, easing: 'ease-out' },
      )
    }

    // Swap sides: one player after another, then names, shuttle, ⇅ and the line come back.
    // On Undo: the same in reverse (last mover first), faster (MOTION.swapBack for the moves),
    // without the tucking copies; the line is simply back.
    const swapSides = (start: number, reverse: boolean) => {
      const speed = reverse ? MOTION.swapBack / (3 * MOTION.swapStagger + MOTION.swapEach) : 1
      const each = MOTION.swapEach * speed
      const stagger = MOTION.swapStagger * speed
      const squash = reverse ? 0 : SQUASH
      const unfurl = reverse ? UNFURL / 2 : UNFURL
      const move = start + (reverse ? 0 : SWAP_MOVE)

      // Server, receiver, server's partner, receiver's partner (partners: whoever is left, the
      // one on the server's half first).
      const serverSide = leftHalf(after.avatars.get(server) ?? { x: 0, y: 0 })
      const partners = [...after.avatars.keys()]
        .filter((id) => id !== server && id !== deps.receiver)
        .sort((a, b) => Number(leftHalf(after.avatars.get(b)!) === serverSide) - Number(leftHalf(after.avatars.get(a)!) === serverSide))
      const forward = [server, deps.receiver, ...partners].filter((id) => after.avatars.has(id))
      const sequence = reverse ? [...forward].reverse() : forward
      const landed = move + (sequence.length - 1) * stagger + each

      sequence.forEach((id, i) => {
        const el = refs.chips.current.get(id)
        const from = before.avatars.get(id)
        const to = after.avatars.get(id)
        if (!el || !from || !to) return
        const animation = play(
          el,
          [
            { transform: `translate(${from.x - to.x}px, ${from.y - to.y}px)`, easing: MOTION.ease },
            { transform: 'translate(0, 0)', offset: each / (each + squash) },
            ...(squash ? [{ transform: 'scale(1.06, 0.94)', offset: (each + squash * 0.5) / (each + squash) }] : []),
            { transform: 'none' },
          ],
          { duration: each + squash, delay: move + i * stagger, fill: 'backwards' },
        )
        // A player who starts later passes underneath the ones already moving.
        raise(el, animation, 10 - i)

        // The new names stay tucked until everyone has landed, then unfurl from the avatar.
        const pill = refs.pills.current.get(id)
        if (pill) {
          pill.style.transformOrigin = pillOrigin(to)
          play(pill, [{ transform: 'scaleX(0)', opacity: 0 }, { transform: 'scaleX(1)', opacity: 1 }], {
            duration: unfurl,
            delay: landed,
            fill: 'backwards',
          })
        }
        // The old names (and the shuttle) tuck into the avatars where they were, before moving.
        if (reverse) return
        const copy = ghost(id, start + SWAP_TUCK + 20, 1)
        const avatar = part(copy, 'avatar')
        if (avatar) avatar.style.visibility = 'hidden'
        const oldPill = part(copy, 'pill')
        if (oldPill) oldPill.style.transformOrigin = pillOrigin(from)
        for (const [target, frames] of [
          [oldPill, [{ transform: 'scaleX(1)', opacity: 1 }, { transform: 'scaleX(0)', opacity: 0 }]],
          [part(copy, 'shuttle'), [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(0.3)', opacity: 0 }]],
        ] as const) {
          play(target, [...frames], { duration: SWAP_TUCK, delay: start, fill: 'both' })
        }
      })

      // The shuttle pops back out of the server after the last player has landed.
      play(
        refs.shuttle.current,
        [{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1.15)', opacity: 1, offset: 0.6 }, { transform: 'none', opacity: 1 }],
        { duration: unfurl, delay: landed, fill: 'backwards' },
      )
      // The ⇅ buttons fade out and back in on the new side (no traffic in the middle).
      const gone = landed + unfurl * 0.33 - start
      for (const el of refs.swapButtons.current.values()) {
        play(el, [{ opacity: 1 }, { opacity: 0, offset: 0.15 }, { opacity: 0, offset: 0.85 }, { opacity: 1 }], {
          duration: gone / 0.85,
          delay: start,
        })
      }
      // The serve line grows again from the shuttle (on Undo it's simply back at the end).
      if (reverse) {
        play(refs.lineMask.current, [{ strokeDashoffset: 1 }, { strokeDashoffset: 1 }], { duration: landed + unfurl })
      } else {
        lineIn(landed + unfurl, LINE_GROW)
      }
    }

    switch (motion.kind) {
      case 'point':
        // The scoring half: a quick tint, never an outline (so it can't read as game point).
        play(refs.flash.current, [{ opacity: 0 }, { opacity: 0.12, offset: 0.12 }, { opacity: 0 }], {
          duration: 400,
          easing: 'ease-out',
        })
        // A point that changes ends: the flash shows first (on the half they scored from), then
        // the swap.
        if (motion.swap) {
          swapSides(SWAP_AFTER_POINT, false)
          break
        }
        lineIn(LINE_FROM, MOTION.point - LINE_FROM)
        hopShuttle(slideMoved(HOP))
        ringPop(HOP)
        break
      case 'swap-positions':
      case 'change-server':
        lineIn(LINE_FROM, MOTION.point - LINE_FROM)
        hopShuttle(slideMoved(HOP))
        ringPop(HOP)
        break
      case 'swap-sides':
        swapSides(0, false)
        break
      case 'undo':
        // Undo of a move that moved players: in reverse, faster, with no flash or ring pop.
        if (motion.swapEnds) swapSides(0, true)
        else slideMoved(MOTION.swapBack)
        break
      case 'change-player': {
        // Someone already on court traded places (picked from the list): they slide.
        slideMoved(HOP)
        // A player replaced: nobody travels. The old name tucks and the avatar shrinks away; the
        // new avatar pops in and its name unfurls.
        for (const id of before.chips.keys()) {
          if (after.chips.has(id)) continue
          const copy = ghost(id, OUT_AVATAR.delay + OUT_AVATAR.duration + 20, 12)
          const from = before.avatars.get(id)
          const oldPill = part(copy, 'pill')
          if (oldPill && from) oldPill.style.transformOrigin = pillOrigin(from)
          const oldShuttle = part(copy, 'shuttle')
          if (oldShuttle) oldShuttle.style.visibility = 'hidden'
          play(oldPill, [{ transform: 'scaleX(1)', opacity: 1 }, { transform: 'scaleX(0)', opacity: 0 }], {
            duration: OUT_PILL,
            fill: 'forwards',
          })
          play(part(copy, 'avatar'), [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(0.6)', opacity: 0 }], {
            ...OUT_AVATAR,
            fill: 'forwards',
          })
        }
        for (const id of after.chips.keys()) {
          if (before.chips.has(id)) continue
          play(
            refs.avatars.current.get(id),
            [{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1.1)', opacity: 1, offset: 0.58 }, { transform: 'scale(1)', opacity: 1 }],
            { ...IN_AVATAR, fill: 'backwards' },
          )
          const pill = refs.pills.current.get(id)
          const to = after.avatars.get(id)
          if (pill && to) {
            pill.style.transformOrigin = pillOrigin(to)
            play(pill, [{ transform: 'scaleX(0)', opacity: 0 }, { transform: 'scaleX(1)', opacity: 1 }], { ...IN_PILL, fill: 'backwards' })
          }
          // Their shuttle (if they serve) waits for the avatar.
          if (id === server) play(refs.shuttle.current, [{ opacity: 0 }, { opacity: 1 }], { ...IN_AVATAR, fill: 'backwards' })
        }
        break
      }
    }
    // Measure on every change of the court or view; the motion id says whether to animate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deps.court, deps.view, motion?.id, reduced])

  // Unmounting: stop everything.
  useLayoutEffect(
    () => () => {
      running.current.forEach((a) => a.cancel())
      ghosts.current.forEach((g) => g.remove())
    },
    [],
  )
}

// Layout positions (transforms ignored) of every player's avatar and chip, a copy of each chip,
// and the shuttle, inside the court.
function take(refs: CourtMotionRefs, container: HTMLElement, server: string): Snapshot {
  const avatars = new Map<string, Point>()
  for (const [id, el] of refs.avatars.current) {
    const b = boxIn(el, container)
    avatars.set(id, { x: b.x + b.w / 2, y: b.y + b.h / 2 })
  }
  const chips = new Map<string, { box: Box; copy: HTMLElement }>()
  for (const [id, el] of refs.chips.current) chips.set(id, { box: boxIn(el, container), copy: el.cloneNode(true) as HTMLElement })
  const s = refs.shuttle.current ? boxIn(refs.shuttle.current, container) : null
  return { avatars, chips, shuttle: s && { x: s.x + s.w / 2, y: s.y + s.h / 2 }, server }
}

function boxIn(el: HTMLElement, container: HTMLElement): Box {
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
