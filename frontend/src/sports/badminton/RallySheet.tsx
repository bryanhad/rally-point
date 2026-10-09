import { BottomSheet } from '../../components/ui/BottomSheet'
import { FlipDigits } from '../../components/ui/FlipDigits'
import { BackIcon, ChevronRightIcon } from '../../components/ui/icons'
import { Court } from './Court'
import { otherTeam, type RallyStep } from './game'
import { Crown } from './icons'
import { TEAM_COLORS, type Config, type Player, type TeamId } from './schema'

const timeFormat = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' })

export type NumberedRally = { step: RallyStep; number: number }

type RallySheetProps = {
  open: boolean
  // All rallies of the current game, oldest first.
  rallies: NumberedRally[]
  // The rally being shown (kept while the sheet animates closed).
  number: number | null
  onNavigate: (number: number) => void
  onClose: () => void
  byId: Map<string, Player>
  colors: Config['teamColors']
}

// Detail of one rally: who won it, the score after it, and the court as it was when it was
// played. The footer steps to the previous / next rally.
export function RallySheet({ open, rallies, number, onNavigate, onClose, byId, colors }: RallySheetProps) {
  const shown = rallies.find((r) => r.number === number)
  const latest = rallies.at(-1)?.number ?? 0
  if (!shown) return null

  const { step } = shown
  const winner = step.event.winner
  const winnerName = colors[winner].charAt(0).toUpperCase() + colors[winner].slice(1)
  // Scores in screen order after the rally, matching the rally chips.
  const order: TeamId[] = [step.after.leftTeam, otherTeam(step.after.leftTeam)]
  const prev = shown.number > 1 ? shown.number - 1 : null
  const next = shown.number < latest ? shown.number + 1 : null

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      label={`Rally ${shown.number}: point to ${winnerName}`}
      eyebrow={`Rally ${shown.number} · ${timeFormat.format(step.event.at)}`}
      title={
        <span className="flex items-center gap-2">
          <Crown />
          Point to <span style={{ color: TEAM_COLORS[colors[winner]] }}>{winnerName}</span>
        </span>
      }
      footer={
        <div className="flex gap-2 border-t border-soft px-3 pt-3 pb-[max(20px,env(safe-area-inset-bottom))]">
          <button
            type="button"
            disabled={prev === null}
            onClick={() => prev !== null && onNavigate(prev)}
            className="flex h-[50px] flex-1 items-center justify-center gap-1.5 rounded-[14px] bg-soft text-sm font-bold text-ink active:opacity-75 disabled:bg-softer disabled:text-disabled"
          >
            <BackIcon size={18} />
            {prev !== null ? `Rally ${prev}` : 'First rally'}
          </button>
          <button
            type="button"
            disabled={next === null}
            onClick={() => next !== null && onNavigate(next)}
            className="flex h-[50px] flex-1 items-center justify-center gap-1.5 rounded-[14px] bg-soft text-sm font-bold text-ink active:opacity-75 disabled:bg-softer disabled:text-disabled"
          >
            {next === null || next === latest ? 'Latest' : `Rally ${next}`}
            <ChevronRightIcon size={18} />
          </button>
        </div>
      }
    >
      <div className="flex items-center justify-center gap-3.5 pt-[18px] pb-4">
        {order.map((team, i) => (
          <div key={team} className="contents">
            {i === 1 && <div className="pb-2.5 text-[26px] font-extrabold text-faint">–</div>}
            <div className="flex flex-col items-center gap-1.5">
              <FlipDigits
                size="lg"
                ring={team === winner}
                label={`${colors[team]} ${step.after.teams[team].score}`}
                tiles={String(step.after.teams[team].score).padStart(2, '0').split('')}
              />
              <span className="h-1 w-7 rounded-sm" style={{ backgroundColor: TEAM_COLORS[colors[team]] }} />
            </div>
          </div>
        ))}
      </div>
      {step.event.swapEnds && (
        <p className="-mt-2 pb-3 text-center text-xs font-semibold text-muted">Sides switched after this rally</p>
      )}
      <div className="px-3 pb-2">
        {/* The court as it was when this rally was played; winners wear the crown. */}
        <Court court={step.before} byId={byId} colors={colors} crownedTeam={winner} />
      </div>
    </BottomSheet>
  )
}
