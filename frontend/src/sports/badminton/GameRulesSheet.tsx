import { gameWinner } from './rules'
import { useState } from 'react'
import { BottomSheet } from '../../components/ui/BottomSheet'
import { digits } from '../../components/ui/digits'
import { FlipDigits } from '../../components/ui/FlipDigits'
import { MinusIcon, PlusIcon } from '../../components/ui/icons'
import { SectionLabel } from '../../components/ui/primitives'
import { NumberInput, StepButton } from '../../components/ui/Stepper'
import { useBadminton } from './context'
import { hasRallies } from './game'
import type { SideSwitch } from './schema'

const POINT_PRESETS = [11, 15, 21, 30]
const MAX_POINTS = 99
const SWAP_KINDS = [
  ['off', 'Off'],
  ['every', 'Every N pts'],
  ['half', 'At half'],
] as const

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

// Points to win + auto swap sides for the current game. Edits a draft; only "Save rules"
// applies it, so closing the sheet any other way discards the changes.
export function GameRulesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <BottomSheet open={open} onClose={onClose} eyebrow="Badminton" title="Game rules">
      {/* Mounted with the sheet, so each opening starts a fresh draft from the saved rules. */}
      <RulesForm onSaved={onClose} />
    </BottomSheet>
  )
}

function RulesForm({ onSaved }: { onSaved: () => void }) {
  const { config, setConfig, court, game } = useBadminton()
  const [totalPoints, setTotalPoints] = useState(config.totalPoints)
  const [kind, setKind] = useState<SideSwitch['kind']>(config.sideSwitch.kind)
  const [every, setEvery] = useState(
    config.sideSwitch.kind === 'every' ? config.sideSwitch.points : config.everyPoints,
  )

  // Once a rally is played, a new target mustn't make the game already won (deuce rules: at
  // least the target and 2 ahead). The current target always stays allowed, e.g. at 21–21 or
  // after Keep playing.
  const topScore = Math.max(court.teams.a.score, court.teams.b.score)
  const scores = { a: court.teams.a.score, b: court.teams.b.score }
  const allowed = (n: number) => !hasRallies(game) || n === config.totalPoints || gameWinner(scores, n) === null
  const valid = allowed(totalPoints)

  function save() {
    if (!valid) return
    const sideSwitch: SideSwitch = kind === 'every' ? { kind, points: every } : { kind }
    setConfig((c) => ({ ...c, totalPoints, sideSwitch, everyPoints: every }))
    onSaved()
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-[18px] px-4 pt-3.5 pb-5">
        <section className="flex flex-col gap-3">
          <SectionLabel>Points to win</SectionLabel>
          <div className="flex items-center justify-between">
            <StepButton
              size="lg"
              label="Decrease points to win"
              disabled={totalPoints <= 1}
              onClick={() => setTotalPoints((n) => clamp(n - 1, 1, MAX_POINTS))}
            >
              <MinusIcon />
            </StepButton>
            <FlipDigits size="xl" tiles={digits(totalPoints)} label={`${totalPoints} points to win`} />
            <StepButton
              size="lg"
              label="Increase points to win"
              disabled={totalPoints >= MAX_POINTS}
              onClick={() => setTotalPoints((n) => clamp(n + 1, 1, MAX_POINTS))}
            >
              <PlusIcon />
            </StepButton>
          </div>
          <p aria-live="polite" className="-mt-1 text-center text-sm font-semibold text-danger empty:hidden">
            {valid ? '' : `Must be higher than ${topScore}, the current top score.`}
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {POINT_PRESETS.map((n) => {
              const selected = totalPoints === n
              return (
                <button
                  key={n}
                  type="button"
                  aria-pressed={selected}
                  disabled={!allowed(n)}
                  onClick={() => setTotalPoints(n)}
                  className={`h-10 rounded-[10px] border-[1.5px] text-sm disabled:border-line disabled:bg-softer disabled:text-disabled ${
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
        </section>

        <div className="h-px bg-soft" />

        <section className="flex flex-col gap-3">
          <SectionLabel>Auto swap sides</SectionLabel>
          <div role="group" aria-label="Auto swap sides" className="grid h-[46px] grid-cols-3 rounded-control bg-soft p-[3px]">
            {SWAP_KINDS.map(([value, text]) => {
              const selected = kind === value
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setKind(value)}
                  className={`rounded-[9px] text-sm ${
                    selected ? 'bg-white font-extrabold text-ink shadow-[0_1px_3px_rgba(20,26,38,0.15)]' : 'font-bold text-muted'
                  }`}
                >
                  {text}
                </button>
              )
            })}
          </div>
          {kind === 'every' && (
            <div className="flex items-center justify-between rounded-control bg-page py-1.5 pr-1.5 pl-3.5">
              <label htmlFor="swap-every" className="text-sm font-semibold text-ink-2">
                Swap every
              </label>
              <div className="flex items-center gap-1.5">
                <StepButton label="Fewer points" disabled={every <= 1} onClick={() => setEvery((n) => clamp(n - 1, 1, MAX_POINTS))}>
                  <MinusIcon size={16} />
                </StepButton>
                <NumberInput id="swap-every" value={every} onCommit={(n) => setEvery(clamp(n, 1, MAX_POINTS))} />
                <StepButton
                  label="More points"
                  disabled={every >= MAX_POINTS}
                  onClick={() => setEvery((n) => clamp(n + 1, 1, MAX_POINTS))}
                >
                  <PlusIcon size={16} />
                </StepButton>
                <span className="pr-1 text-sm font-semibold text-ink-2">pts</span>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Sits right under the rules so it's easy to notice; on short screens where the rules
          scroll, sticky keeps it pinned to the bottom of the sheet instead. */}
      <div className="sticky bottom-0 bg-white px-4 pt-3 pb-[max(20px,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={save}
          disabled={!valid}
          className="h-[52px] w-full rounded-[14px] bg-band text-[15px] font-extrabold text-white active:opacity-80 disabled:bg-line disabled:text-subtle"
        >
          Save rules
        </button>
      </div>
    </div>
  )
}
