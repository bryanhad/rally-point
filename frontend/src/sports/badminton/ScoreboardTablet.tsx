import { AnimatedChipStrip } from '../../components/ui/AnimatedChipStrip'
import { Link } from '@tanstack/react-router'
import type { ComponentProps, ReactNode } from 'react'
import {
  BackIcon,
  FlagIcon,
  GearIcon,
  PlusIcon,
  RedoIcon,
  ResetIcon,
  TrophyIcon,
  UndoIcon,
  UserPlusIcon,
} from '../../components/ui/icons'
import { GamePointBadge, ScoreToast } from './ScoreToast'
import { Avatar } from './Avatar'
import { ViewChip } from './Court'
import { EMPTY_SLOT, screenScore, serverId, teamOn, type SideKey } from './game'
import { TEAM_COLORS, type Player, type TeamId } from './schema'
import { ModeSwitch, RulesTile, SessionTile } from './ScoreboardParts'
import { colorName, describeResult, toastColors, type ScoreboardView } from './scoreboardView'
import { viewSide } from './view'
import { useCrossSlide } from './motion'

const SIDES: SideKey[] = ['left', 'right']

// The serve colour on the tablet: the serving row's avatar ring and shuttle.
const SERVE_GREEN = '#23964F'

// Tablet scoreboard ("B2"): made to be read from a few metres away, so it shows only the
// scores, who serves and the game actions. The court diagram lives in the Court preview.
// Landscape and portrait share this tree; the differences are tablet-portrait: classes.
export function ScoreboardTablet({ v, className = '' }: { v: ScoreboardView; className?: string }) {
  const { court, config, session } = v
  const server = serverId(court)
  // Score blocks left to right; they slide past each other whenever they change sides.
  const order = SIDES.map((side) => teamOn(court, viewSide(side, v.view)))
  const slideRef = useCrossSlide(order, { ...v.buttonSlide, onTop: 'a' })
  // A state covering the live screen (the band stays usable): no session, picking this game's
  // players, or an empty spot. Covered controls are inert: no taps, focus or screen reader.
  const cover: Cover = !session ? 'no-session' : v.pickPending ? 'next-up' : v.emptySpot ? 'empty-spot' : null
  const covered = cover !== null

  return (
    <div className={`relative min-h-0 flex-1 flex-col ${className}`}>
      {/* A state's dark layer covers the whole screen: behind the band's rounded corners and over
          the app footer (outside <main>) too. The band sits above it and stays usable. */}
      {covered && <div aria-hidden className="fixed inset-0 z-[5] bg-[rgba(20,26,38,0.62)]" />}

      {/* Band: one row of 60px tiles. */}
      <header
        className="relative z-[7] flex shrink-0 items-center gap-2.5 rounded-b-band bg-band px-6 pb-3 text-white"
        style={{ paddingTop: 'max(10px, env(safe-area-inset-top))' }}
      >
        <Link to="/" aria-label="Back to home" className={BAND_LINK}>
          <BackIcon size={24} />
        </Link>
        <div aria-hidden className="w-1 shrink-0" />
        <ModeSwitch mode={config.mode} onMode={v.onMode} size="tablet" />
        <div className="flex-1" />
        <SessionTile session={session} players={v.players} onClick={v.onOpenSession} wide />
        <RulesTile config={config} onClick={v.onOpenRules} wide />
        {/* The court diagram and its actions live in the Court preview. */}
        <button
          type="button"
          onClick={v.onOpenCourt}
          aria-label="Open court preview"
          className="flex size-[60px] shrink-0 items-center justify-center rounded-2xl bg-white shadow-[0_2px_8px_rgba(20,26,38,0.18)] active:opacity-85"
          style={{ color: SERVE_GREEN }}
        >
          <CourtIcon />
        </button>
        <Link to="/sports/badminton/config" aria-label="Badminton settings" className={BAND_LINK}>
          <GearIcon size={24} />
        </Link>
      </header>

      {/* Everything under the band. A state's card is centred in this area. */}
      <div className="relative flex min-h-0 flex-1 flex-col">
        {/* Top row: the rallies strip and match history (the match type switch is in the band). */}
        <div inert={covered} className="flex shrink-0 items-center gap-3 px-6 pt-3.5">
          <h2 className="shrink-0 text-xs font-extrabold tracking-[0.12em] text-muted">RALLIES</h2>
          {/* Newest on the left: a new rally pops in, Undo pops it out. */}
          <AnimatedChipStrip
            empty={<p className="min-w-0 flex-1 truncate text-[15px] text-faint">Tap a team's score to log the first rally</p>}
            gap={8}
            className="min-w-0 flex-1 overflow-x-auto p-1 [scrollbar-width:none] [mask-image:linear-gradient(90deg,#000_88%,transparent)] [&::-webkit-scrollbar]:hidden"
            items={v.rallies.map(({ step, number }) => ({
              key: String(number),
              render: (latest) => (
                <button
                  type="button"
                  onClick={() => v.onOpenRally(number)}
                  aria-label={`Rally ${number}: ${screenScore(step.after, v.view)}`}
                  className={`flex h-11 min-w-[62px] shrink-0 items-center justify-center rounded-control px-3 text-base font-extrabold text-white tabular-nums transition-shadow duration-[120ms] active:opacity-80 ${
                    latest ? 'shadow-[0_0_0_2px_#fff,0_0_0_4px_var(--color-ink)]' : ''
                  }`}
                  style={{ backgroundColor: TEAM_COLORS[config.teamColors[step.event.winner]] }}
                >
                  {screenScore(step.after, v.view)}
                </button>
              ),
            }))}
          />
          {/* Only while Facing referee: explains the swapped blocks, and one tap flips back. */}
          {v.view === 'facing' && <ViewChip view="facing" size="xl" onFlip={v.onFlipView} />}
          <TabletButton icon={<TrophyIcon size={18} />} className="gap-1.5 px-3.5 text-band-ink" onClick={v.onOpenHistory}>
            Match history
          </TabletButton>
        </div>

        {/* Score blocks: the left block is the team drawn on the left of the court (Facing
            referee turns it, so the blocks swap too). */}
        <div className="relative flex min-h-0 flex-1 gap-5 px-6 pt-4 pb-5">
          {order.map((team) => (
            // Keyed by team, so each block keeps its team while it slides.
            <ScoreBlock key={team} blockRef={slideRef(team)} team={team} v={v} server={server} cover={cover} />
          ))}
          {/* Game point toast over the top of the score area, no dim. With the Court preview
              open it plays on that court instead. */}
          {v.toast && !v.courtOpen && (
            <ScoreToast key={v.toast.id} toast={v.toast} {...toastColors(v)} className="inset-x-0 top-10" />
          )}
        </div>

        {/* Game actions: history controls on the left, reset/end on the right. */}
        <div
          inert={covered}
          className="mx-6 flex shrink-0 items-center justify-between border-t-2 border-line pt-[18px] pb-4">
          <div className="flex gap-2">
            <TabletButton icon={<UndoIcon size={20} />} onClick={v.onUndo} disabled={!v.canUndo}>
              Undo
            </TabletButton>
            <TabletButton aria-label="Redo" icon={<RedoIcon size={20} />} onClick={v.onRedo} disabled={!v.canRedo} />
          </div>
          <div className="flex gap-5">
            <TabletButton aria-label="Reset game" icon={<ResetIcon size={20} />} onClick={v.onReset} disabled={!v.canUndo}>
              Reset
            </TabletButton>
            {/* Only once a team has reached the total (e.g. after choosing Keep playing). */}
            <button
              type="button"
              onClick={v.onEnd}
              disabled={v.blocked || !v.reachedTotal || v.emptySpot}
              title={v.reachedTotal ? undefined : `Available once a team reaches ${config.totalPoints}`}
              className="flex h-[52px] items-center gap-2 rounded-[14px] bg-ink px-4 text-[15px] font-bold text-white active:opacity-75 disabled:border-[1.5px] disabled:border-dashed disabled:border-line-strong disabled:bg-white disabled:text-faint"
            >
              <FlagIcon size={20} />
              End game
            </button>
          </div>
        </div>

        {covered && (
          // Above the dark layer; only the card itself catches taps.
          <div
            className={`pointer-events-none absolute inset-0 z-[6] flex flex-col items-center p-6 *:pointer-events-auto ${
              cover === 'empty-spot' ? 'justify-start' : 'justify-center'
            }`}
          >
            {cover === 'no-session' && <NoSessionCard onStart={v.onNewSession} />}
            {cover === 'next-up' && <NextUpCard v={v} />}
            {cover === 'empty-spot' && <EmptySpotHint />}
          </div>
        )}
      </div>
    </div>
  )
}

type Cover = 'no-session' | 'next-up' | 'empty-spot' | null

const CARD =
  'flex max-w-[calc(100%-48px)] flex-col items-center gap-[18px] rounded-[28px] bg-white p-8 text-center shadow-[0_24px_60px_rgba(0,0,0,0.35)]'
const CARD_EYEBROW = 'text-[15px] font-extrabold tracking-[0.24em] text-muted'
const CARD_PRIMARY =
  'flex h-[60px] items-center gap-2.5 rounded-[18px] bg-band text-lg font-extrabold text-white active:opacity-85'

// No session: play starts with a session.
function NoSessionCard({ onStart }: { onStart: () => void }) {
  return (
    <section aria-label="No session" className={`${CARD} w-[520px]`}>
      <div className={CARD_EYEBROW}>NO SESSION</div>
      <p className="text-xl font-bold text-ink">Start a session to choose who&apos;s here today.</p>
      <button type="button" onClick={onStart} className={`${CARD_PRIMARY} mt-1 px-7`}>
        <PlusIcon size={22} />
        New session
      </button>
    </section>
  )
}

// Before each game of a session: how the last one ended, then pick players or keep last game's.
function NextUpCard({ v }: { v: ScoreboardView }) {
  const result = v.lastResult && describeResult(v.lastResult.entry)
  return (
    <section aria-label={`Next up, game ${v.gameNumber ?? 1}`} className={`${CARD} w-[600px]`}>
      <div className={CARD_EYEBROW}>NEXT UP · GAME {v.gameNumber ?? 1}</div>
      {v.lastResult && result && (
        <p className="text-lg font-semibold text-ink">
          Game {v.lastResult.gameNumber}{' '}
          {result.draw ? (
            <>was a draw, {result.score}</>
          ) : (
            <>
              went to <b style={{ color: result.color }}>{result.team}</b>, {result.score}
            </>
          )}
        </p>
      )}
      <div className="mt-1 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={v.onPickPlayers} className={`${CARD_PRIMARY} px-[26px]`}>
          <UserPlusIcon size={22} />
          Pick players
        </button>
        {v.sameLineup && (
          <button
            type="button"
            onClick={v.onSamePlayers}
            aria-label={`Same players: ${v.sameLineup.map((p) => p.name).join(', ')}`}
            className="flex h-[60px] items-center gap-3 rounded-[18px] border-2 border-line-strong bg-white px-5 text-lg font-extrabold text-ink active:bg-softer"
          >
            <span className="flex" aria-hidden>
              {v.sameLineup.map((p, i) => (
                <Avatar key={p.id} player={p} size={36} className={`border-2 border-white ${i > 0 ? '-ml-2.5' : ''}`} />
              ))}
            </span>
            Same players
          </button>
        )}
      </div>
    </section>
  )
}

// Empty spot: a hint near the top; the empty row itself is raised above the dark layer.
function EmptySpotHint() {
  return (
    <div
      role="status"
      className="mt-[70px] flex items-center gap-3 rounded-[18px] bg-white px-[22px] py-3.5 shadow-[0_12px_30px_rgba(0,0,0,0.3)]"
    >
      <span
        aria-hidden
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#FFF3CC] text-xl font-extrabold text-[#7A5A00]"
      >
        !
      </span>
      <div className="text-left">
        <div className="text-[17px] font-extrabold text-ink">Fill every spot on the court to keep scoring</div>
        <div className="text-sm font-semibold text-muted">Tap the empty spot to pick a player</div>
      </div>
    </div>
  )
}

const BAND_LINK = 'flex size-12 shrink-0 items-center justify-center rounded-control text-white active:bg-white/15'

// 52px soft button of the tablet rows. Icon-only buttons must pass `aria-label`.
function TabletButton({
  icon,
  children,
  className = '',
  ...rest
}: ComponentProps<'button'> & { icon: ReactNode }) {
  return (
    <button
      type="button"
      className={`flex h-[52px] min-w-[52px] shrink-0 items-center justify-center gap-2 rounded-[14px] bg-soft text-[15px] font-bold text-ink enabled:active:opacity-75 disabled:bg-softer disabled:text-disabled ${
        children ? 'px-4' : ''
      } ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}

// One team's block. A transparent point button fills it (a tap anywhere is a point to that team)
// and the number and rows sit on top without catching taps, so an empty spot can be a real
// button of its own (buttons can't be nested). The number is sized from the space it gets
// (container query units), up to 320px (250px in portrait).
function ScoreBlock({
  team,
  v,
  server,
  cover,
  blockRef,
}: {
  team: TeamId
  v: ScoreboardView
  server: string
  cover: Cover
  blockRef: (el: HTMLElement | null) => void
}) {
  const { court, config } = v
  // Between games the court still holds last game's lineup at 0–0, so nobody is shown serving.
  const showServe = cover !== 'next-up' && cover !== 'no-session'
  const serverName = showServe && court.teams[team].ids.includes(server) ? v.byId.get(server)?.name : undefined
  const gamePoint = v.gamePoint === team
  return (
    <div
      ref={blockRef}
      className="relative flex min-h-0 min-w-0 flex-1 flex-col rounded-[28px] px-4 pb-4 text-white select-none has-[>.point:active]:opacity-90"
      style={{ backgroundColor: TEAM_COLORS[config.teamColors[team]] }}
    >
      <button
        type="button"
        inert={cover !== null}
        onClick={() => v.onRally(team)}
        aria-label={`Point to Team ${colorName(config, team)}${gamePoint ? '. Game point' : ''}${serverName ? `. ${serverName} serves next` : ''}`}
        className="point absolute inset-0 rounded-[inherit]"
      />
      <span
        aria-hidden
        className="pointer-events-none relative flex min-h-0 w-full flex-1 items-center justify-center"
        style={{ containerType: 'size' }}
      >
        <span
          className="text-[min(80cqh,75cqw,320px)] leading-[0.85] tracking-[-0.03em] tabular-nums tablet-portrait:text-[min(80cqh,75cqw,250px)]"
          style={{ fontWeight: config.thickness }}
        >
          {court.teams[team].score}
        </span>
      </span>
      {gamePoint && <GamePointBadge size="lg" />}
      <span aria-hidden className="pointer-events-none relative mx-1 mb-3.5 h-0.5 shrink-0 self-stretch bg-white/28" />
      {/* Rows stay put for the whole game; only the white serve pill moves. The court ids swap
          places as the serving team wins points, but this screen shows no court, so positions
          would only make the rows jump. Read from afar, the pill alone says who serves. */}
      <div className="pointer-events-none relative flex w-full shrink-0 flex-row gap-3 tablet-portrait:flex-col tablet-portrait:gap-3.5">
        {/* Facing referee turns the court, so each block's players read in reverse. */}
        {(v.view === 'facing' ? fixedOrder(court.teams[team].ids, v.byId).reverse() : fixedOrder(court.teams[team].ids, v.byId)).map(({ id, slot }) => {
          if (id !== EMPTY_SLOT) {
            const player = v.byId.get(id)
            return player ? <PlayerRow key={slot} player={player} serving={showServe && id === server} /> : <PlaceholderRow key={slot} />
          }
          // Mid-game, an empty spot is the one thing to tap; otherwise it's just a placeholder.
          return cover === 'empty-spot' ? (
            <TapToPick key={slot} teamName={colorName(config, team)} onClick={() => v.onPick(team, slot)} />
          ) : (
            <PlaceholderRow key={slot} />
          )
        })}
      </div>
    </div>
  )
}

// A team's spots in a fixed order: players by name, then empty spots. Each keeps its court slot,
// which Tap to pick still needs.
function fixedOrder(ids: string[], byId: ScoreboardView['byId']) {
  const nameOf = (id: string) => byId.get(id)?.name ?? ''
  return ids
    .map((id, slot) => ({ id, slot }))
    .sort((x, y) => {
      if ((x.id === EMPTY_SLOT) !== (y.id === EMPTY_SLOT)) return x.id === EMPTY_SLOT ? 1 : -1
      return nameOf(x.id).localeCompare(nameOf(y.id), undefined, { sensitivity: 'base' }) || x.slot - y.slot
    })
}

const ROW = 'flex h-20 min-w-0 flex-1 items-center gap-3 rounded-full py-2.5 pr-[18px] pl-2.5'

// A player under the score. Every row has the same box (height, padding, ring width, room for
// the shuttle), so the serve moving changes colours only.
function PlayerRow({ player, serving }: { player: Player; serving: boolean }) {
  return (
    <div className={`${ROW} ${serving ? 'bg-white' : ''}`}>
      <Avatar
        player={player}
        size={60}
        className="border-[5px]"
        style={{ borderColor: serving ? SERVE_GREEN : 'rgba(255,255,255,0.85)' }}
      />
      <span className={`min-w-0 flex-1 truncate text-left text-2xl font-extrabold ${serving ? 'text-ink' : 'text-white'}`}>
        {player.name}
      </span>
      <ServeShuttle className={serving ? '' : 'invisible'} />
    </div>
  )
}

// A spot with nobody in it yet (no session, or before this game's players are picked).
function PlaceholderRow() {
  return (
    <div aria-hidden className={ROW}>
      <span className="size-[60px] shrink-0 rounded-full border-[3px] border-dashed border-white/50" />
      <span className="h-3.5 max-w-[140px] flex-1 rounded-[7px] bg-white/28" />
    </div>
  )
}

// An empty spot mid-game: raised above the dark layer; opens Change player for this spot.
function TapToPick({ teamName, onClick }: { teamName: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Empty Team ${teamName} spot. Tap to pick a player`}
      className={`${ROW} pointer-events-auto relative z-[6] border-[2.5px] border-dashed border-white bg-white/16 text-white active:bg-white/25`}
    >
      <span className="flex size-14 shrink-0 items-center justify-center rounded-full border-[3px] border-dashed border-white">
        <PlusIcon size={26} />
      </span>
      <span className="truncate text-2xl font-extrabold">Tap to pick</span>
    </button>
  )
}

// Green outline shuttle at the end of the serving row.
function ServeShuttle({ className = '' }: { className?: string }) {
  return (
    <svg
      width="24"
      height="30"
      viewBox="0 0 20 26"
      fill="none"
      stroke="#1E7F43"
      strokeWidth="1.9"
      strokeLinejoin="round"
      aria-hidden
      className={`shrink-0 ${className}`}
    >
      <path d="M3 2h14l-3 15H6z" />
      <path d="M8 2l.8 15" />
      <path d="M12 2l-.8 15" />
      <circle cx="10" cy="20.5" r="3.6" fill="#1E7F43" />
    </svg>
  )
}

// Court outline with the net and service lines: the band's Court preview button.
function CourtIcon() {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <path d="M12 5v14" />
      <path d="M3 12h5" />
      <path d="M16 12h5" />
    </svg>
  )
}
