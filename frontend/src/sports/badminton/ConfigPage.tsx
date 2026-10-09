import { Link } from '@tanstack/react-router'
import { useState, type CSSProperties, type ReactNode } from 'react'
import { digits } from '../../components/ui/digits'
import { FlipDigits } from '../../components/ui/FlipDigits'
import { BandCaption, FrameCell, HeaderBand } from '../../components/ui/HeaderBand'
import { BackIcon, ChevronRightIcon, GearIcon, MinusIcon, PlusIcon, SwapIcon } from '../../components/ui/icons'
import { Card, SectionLabel } from '../../components/ui/primitives'
import { Avatar } from './Avatar'
import { useBadminton } from './context'
import { otherTeam } from './game'
import { PlayersSheet } from './PlayersSheet'
import { TEAM_COLORS, type SideSwitch, type TeamColor, type TeamId } from './schema'

const POINT_PRESETS = [11, 15, 21, 30]
const MAX_POINTS = 99

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

export function ConfigPage() {
  const { config, setConfig, court, game } = useBadminton()
  const [playersOpen, setPlayersOpen] = useState(false)

  function setSideSwitch(kind: SideSwitch['kind']) {
    setConfig((c) => {
      if (kind === c.sideSwitch.kind) return c
      // Remember N when leaving "every"; reuse it when coming back.
      const everyPoints = c.sideSwitch.kind === 'every' ? c.sideSwitch.points : c.everyPoints
      const sideSwitch: SideSwitch = kind === 'every' ? { kind, points: everyPoints } : { kind }
      return { ...c, sideSwitch, everyPoints }
    })
  }

  const setTotal = (n: number) => setConfig((c) => ({ ...c, totalPoints: clamp(n, 1, MAX_POINTS) }))
  const setEvery = (n: number) => {
    const points = clamp(n, 1, MAX_POINTS)
    setConfig((c) => ({ ...c, sideSwitch: { kind: 'every', points }, everyPoints: points }))
  }

  // Live scores in screen order for the thickness preview.
  const previewTeams: TeamId[] = [court.leftTeam, otherTeam(court.leftTeam)]
  const saved = game.players

  return (
    <div className="flex flex-1 flex-col bg-page">
      <HeaderBand
        title="BADMINTON"
        bottom="md"
        left={
          <Link
            to="/sports/badminton"
            aria-label="Back to scoreboard"
            className="flex size-11 items-center justify-center rounded-control text-white active:bg-white/15"
          >
            <BackIcon />
          </Link>
        }
      >
        <FrameCell className="flex h-16 flex-1 flex-col justify-center gap-0.5 px-3.5">
          <BandCaption>CONFIG</BandCaption>
          <h1 className="text-xl font-extrabold">Match rules</h1>
        </FrameCell>
        <FrameCell divider className="flex w-[72px] items-center justify-center text-flip-digit">
          <GearIcon size={28} />
        </FrameCell>
      </HeaderBand>

      <div className="flex flex-col gap-3 px-3 pt-4 pb-[max(24px,env(safe-area-inset-bottom))]">
        <Card>
          <SectionLabel>Points to win</SectionLabel>
          <div className="flex items-center justify-between">
            <StepButton
              size="lg"
              label="Decrease points to win"
              disabled={config.totalPoints <= 1}
              onClick={() => setTotal(config.totalPoints - 1)}
            >
              <MinusIcon />
            </StepButton>
            <FlipDigits
              size="xl"
              tiles={digits(config.totalPoints)}
              label={`${config.totalPoints} points to win`}
            />
            <StepButton
              size="lg"
              label="Increase points to win"
              disabled={config.totalPoints >= MAX_POINTS}
              onClick={() => setTotal(config.totalPoints + 1)}
            >
              <PlusIcon />
            </StepButton>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {POINT_PRESETS.map((n) => {
              const selected = config.totalPoints === n
              return (
                <button
                  key={n}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setTotal(n)}
                  className={`h-11 rounded-[10px] border-[1.5px] text-sm ${
                    selected
                      ? 'border-band bg-accent-soft font-extrabold text-band-ink'
                      : 'border-line bg-white font-bold text-ink-2 active:bg-softer'
                  }`}
                >
                  {n}
                </button>
              )
            })}
          </div>
        </Card>

        <Card>
          <SectionLabel>Auto swap sides</SectionLabel>
          <div
            role="group"
            aria-label="Auto swap sides"
            className="grid h-[46px] grid-cols-3 rounded-control bg-soft p-[3px]"
          >
            {(
              [
                ['off', 'Off'],
                ['every', 'Every N pts'],
                ['half', 'At half'],
              ] as const
            ).map(([kind, text]) => {
              const selected = config.sideSwitch.kind === kind
              return (
                <button
                  key={kind}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setSideSwitch(kind)}
                  className={`rounded-[9px] text-sm ${
                    selected
                      ? 'bg-white font-extrabold text-ink shadow-[0_1px_3px_rgba(20,26,38,0.15)]'
                      : 'font-bold text-muted'
                  }`}
                >
                  {text}
                </button>
              )
            })}
          </div>
          {config.sideSwitch.kind === 'every' && (
            <div className="flex items-center justify-between rounded-control bg-page py-1.5 pr-1.5 pl-3.5">
              <label htmlFor="swap-every" className="text-sm font-semibold text-ink-2">
                Swap every
              </label>
              <div className="flex items-center gap-1.5">
                <StepButton
                  label="Fewer points"
                  disabled={config.sideSwitch.points <= 1}
                  onClick={() => setEvery(config.sideSwitch.kind === 'every' ? config.sideSwitch.points - 1 : 1)}
                >
                  <MinusIcon size={16} />
                </StepButton>
                <NumberInput id="swap-every" value={config.sideSwitch.points} onCommit={setEvery} />
                <StepButton
                  label="More points"
                  disabled={config.sideSwitch.points >= MAX_POINTS}
                  onClick={() => setEvery(config.sideSwitch.kind === 'every' ? config.sideSwitch.points + 1 : 1)}
                >
                  <PlusIcon size={16} />
                </StepButton>
                <span className="pr-1 text-sm font-semibold text-ink-2">pts</span>
              </div>
            </div>
          )}
          {config.sideSwitch.kind === 'half' && (
            <div className="flex h-[52px] items-center justify-between rounded-control bg-page px-3.5 text-sm font-semibold text-ink-2">
              Swaps at
              <span className="font-extrabold text-ink">{Math.ceil(config.totalPoints / 2)} pts</span>
            </div>
          )}
        </Card>

        <Card>
          <SectionLabel>Score thickness</SectionLabel>
          <div className="flex h-24 gap-2">
            {previewTeams.map((team) => (
              <div
                key={team}
                className="flex flex-1 items-center justify-center rounded-[14px] text-[60px] leading-none text-white tabular-nums"
                style={{ backgroundColor: TEAM_COLORS[config.teamColors[team]], fontWeight: config.thickness }}
              >
                {court.teams[team].score}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span aria-hidden className="text-[15px] font-normal text-muted">
              Aa
            </span>
            <input
              type="range"
              min={100}
              max={900}
              step={100}
              value={config.thickness}
              onChange={(e) => setConfig((c) => ({ ...c, thickness: Number(e.target.value) }))}
              aria-label="Score thickness"
              className="range flex-1"
              style={{ '--fill': `${((config.thickness - 100) / 800) * 100}%` } as CSSProperties}
            />
            <span aria-hidden className="text-[15px] font-black text-ink">
              Aa
            </span>
          </div>
        </Card>

        <Card>
          <SectionLabel>Team colours</SectionLabel>
          <div className="flex flex-col gap-3">
            {(['a', 'b'] as const).map((team) => (
              <ColorRow
                key={team}
                team={team}
                value={config.teamColors[team]}
                taken={config.teamColors[otherTeam(team)]}
                onChange={(color) => setConfig((c) => ({ ...c, teamColors: { ...c.teamColors, [team]: color } }))}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => setConfig((c) => ({ ...c, teamColors: { a: c.teamColors.b, b: c.teamColors.a } }))}
            className="flex h-[46px] items-center justify-center gap-2 rounded-control border-[1.5px] border-line bg-white text-sm font-bold text-ink active:bg-softer"
          >
            <SwapIcon size={18} />
            Swap colours
          </button>
        </Card>

        <Card>
          <SectionLabel>Players</SectionLabel>
          <button
            type="button"
            onClick={() => setPlayersOpen(true)}
            className="flex min-h-[52px] items-center gap-3 rounded-control text-left active:bg-softer"
          >
            <div className="flex">
              {saved.length === 0 ? (
                <span className="flex size-9 items-center justify-center rounded-full bg-accent-soft text-band-ink">
                  <PlusIcon size={16} />
                </span>
              ) : (
                <>
                  {saved.slice(0, 3).map((p, i) => (
                    <Avatar key={p.id} name={p.name} size={36} className={`border-2 border-white ${i > 0 ? '-ml-2.5' : ''}`} />
                  ))}
                  {saved.length > 3 && (
                    <span className="-ml-2.5 flex size-9 items-center justify-center rounded-full border-2 border-white bg-ink text-[11px] font-extrabold text-white">
                      +{saved.length - 3}
                    </span>
                  )}
                </>
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="text-[15px] font-bold">Manage players</div>
              <div className="text-[13px] text-muted">
                {saved.length === 0
                  ? 'No saved players yet'
                  : `${saved.length} saved ${saved.length === 1 ? 'player' : 'players'}`}
              </div>
            </div>
            <ChevronRightIcon className="text-muted" />
          </button>
        </Card>
      </div>

      <PlayersSheet open={playersOpen} onClose={() => setPlayersOpen(false)} />
    </div>
  )
}

type StepButtonProps = {
  label: string
  onClick: () => void
  disabled?: boolean
  size?: 'md' | 'lg'
  children: ReactNode
}

// Square − / + button: 52px soft (points to win) or 40px white (inside a tinted row).
function StepButton({ label, onClick, disabled, size = 'md', children }: StepButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`flex shrink-0 items-center justify-center text-ink active:opacity-70 disabled:text-disabled ${
        size === 'lg' ? 'size-[52px] rounded-[14px] bg-soft' : 'size-11 rounded-[10px] bg-white'
      }`}
    >
      {children}
    </button>
  )
}

// Number box that shows the saved value unless the user is typing in it, so − / + stay in
// sync. Only whole numbers >= 1 are saved; an invalid entry reverts on blur.
function NumberInput({ id, value, onCommit }: { id: string; value: number; onCommit: (n: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null)
  const text = draft ?? String(value)
  const valid = /^\d+$/.test(text) && Number(text) >= 1
  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      value={text}
      onFocus={() => setDraft(String(value))}
      onChange={(e) => {
        setDraft(e.target.value)
        if (/^\d+$/.test(e.target.value) && Number(e.target.value) >= 1) onCommit(Number(e.target.value))
      }}
      onBlur={() => setDraft(null)}
      aria-invalid={!valid}
      className={`h-11 w-11 rounded-[10px] border-[1.5px] bg-white text-center text-base font-extrabold text-ink tabular-nums ${
        valid ? 'border-line-strong' : 'border-danger'
      }`}
    />
  )
}

type ColorRowProps = {
  team: TeamId
  value: TeamColor
  // The other team's colour; it can't be picked here.
  taken: TeamColor
  onChange: (color: TeamColor) => void
}

function ColorRow({ team, value, taken, onChange }: ColorRowProps) {
  const other = team === 'a' ? 'B' : 'A'
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-16 shrink-0 text-sm font-bold">Team {team.toUpperCase()}</div>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(TEAM_COLORS) as TeamColor[]).map((color) => {
          const selected = color === value
          const isTaken = color === taken
          return (
            <button
              key={color}
              type="button"
              onClick={() => onChange(color)}
              disabled={isTaken}
              aria-pressed={selected}
              aria-label={`${titleCase(color)}${selected ? ', selected' : isTaken ? `, used by Team ${other}` : ''}`}
              style={{ backgroundColor: TEAM_COLORS[color] }}
              className={`relative size-11 rounded-full disabled:opacity-25 ${
                selected ? 'shadow-[0_0_0_3px_#fff,0_0_0_5px_var(--color-ink)]' : ''
              }`}
            >
              {isTaken && (
                <svg viewBox="0 0 40 40" className="absolute inset-0 size-full" aria-hidden>
                  <path d="M10 30L30 10" stroke="var(--color-ink)" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
