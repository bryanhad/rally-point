import { BottomSheet } from '../../components/ui/BottomSheet'
import { BackIcon, ChevronRightIcon } from '../../components/ui/icons'
import { Court } from './Court'
import { otherTeam, teamOn, type RallyStep } from './game'
import { TEAM_COLORS, TEAM_TINTS, type Config, type CourtView, type Player, type TeamId } from './schema'
import { viewSide } from './view'
import { teamName } from './scoreboardView'
import { TeamScorePair, type TeamScore } from './TeamScore'

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
  // Referee view / Facing referee, so the snapshot matches the live court.
  view: CourtView
}

// Detail of one rally: who won it, the score after it, and the court as it was when it was
// played. The footer steps to the previous / next rally.
export function RallySheet({ open, rallies, number, onNavigate, onClose, byId, colors, view }: RallySheetProps) {
  const shown = rallies.find((r) => r.number === number)
  const latest = rallies.at(-1)?.number ?? 0
  if (!shown) return null

  const { step } = shown
  const winner = step.event.winner
  const winnerName = colors[winner].charAt(0).toUpperCase() + colors[winner].slice(1)
  // Scores in screen order after the rally, matching the rally chips.
  const left = teamOn(step.after, viewSide('left', view))
  const order: TeamId[] = [left, otherTeam(left)]
  const prev = shown.number > 1 ? shown.number - 1 : null
  const next = shown.number < latest ? shown.number + 1 : null

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      label={`Rally ${shown.number}, point to ${winnerName}`}
      // Which rally this is (the one tapped in the list) and who won it.
      title={
        <span className="flex items-baseline gap-2">
          <span className="text-[28px] tracking-[-0.01em]">Rally {shown.number}</span>
          <span className="text-sm font-semibold text-subtle">{timeFormat.format(step.event.at)}</span>
        </span>
      }
      subtitle={
        <span className="-mt-1.5 flex items-center gap-1.5 text-[15px] font-bold text-muted">
          <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: TEAM_COLORS[colors[winner]] }} />
          Point to <span style={{ color: TEAM_TINTS[colors[winner]].fg }}>{winnerName}</span>
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
      <div className="flex justify-center pt-[18px] pb-4">
        {/* The point winner's tile wears the gold ring. */}
        <TeamScorePair
          size="md"
          scores={
            order.map((team) => ({
              color: colors[team],
              score: step.after.teams[team].score,
              name: teamName(colors[team]),
              ring: team === winner,
            })) as [TeamScore, TeamScore]
          }
        />
      </div>
      {step.event.swapEnds && (
        <p className="-mt-2 pb-3 text-center text-xs font-semibold text-muted">Sides switched after this rally</p>
      )}
      <div className="px-3 pb-2">
        {/* The court as it was when this rally was played (who served, who received). */}
        <Court court={step.before} byId={byId} colors={colors} view={view} />
      </div>
    </BottomSheet>
  )
}
