import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { ConfirmDialog } from '../components/ui/Dialog'
import { FlipDigits } from '../components/ui/FlipDigits'
import { FrameCell, HeaderBand } from '../components/ui/HeaderBand'
import { readLastSport } from '../lib/lastSport'
import { useBadminton } from '../sports/badminton/context'
import { hasRallies, otherTeam, screenScore } from '../sports/badminton/game'
import { HistorySheet } from '../sports/badminton/HistorySheet'
import { BadmintonMark, Rackets } from '../sports/badminton/icons'
import { TEAM_COLORS, type Config, type HistoryEntry } from '../sports/badminton/schema'

const LABEL = 'text-[13px] font-bold tracking-[0.06em] text-muted'
const MODE_NAME = { singles: 'Singles', doubles: 'Doubles' } as const

export function HomePage() {
  const { game, court, config, setConfig, dispatch, history } = useBadminton()
  const navigate = useNavigate()
  // Read once on arrival: the sport most recently scored decides the in-progress card.
  const [lastSport] = useState(readLastSport)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [pendingMode, setPendingMode] = useState<Config['mode'] | null>(null)

  const ongoing = hasRallies(game)
  const showProgress = lastSport === 'badminton' && ongoing
  const order = [court.leftTeam, otherTeam(court.leftTeam)]

  // Start a fresh badminton game in `mode` (without saving the current one) and open it.
  function begin(mode: Config['mode']) {
    if (mode !== config.mode) {
      setConfig((c) => ({ ...c, mode }))
      dispatch({ type: 'setMode', mode })
    } else if (ongoing) {
      dispatch({ type: 'restart' })
    }
    setPendingMode(null)
    navigate({ to: '/sports/badminton' })
  }

  function start(mode: Config['mode']) {
    if (ongoing) setPendingMode(mode)
    else begin(mode)
  }

  return (
    <div className="flex flex-1 flex-col">
      <HeaderBand title="RALLY POINT" align="left" bottom="lg">
        <FrameCell className="flex min-h-[150px] flex-1 flex-col justify-center gap-2 p-4">
          <div className="text-[11px] font-bold tracking-[0.28em] opacity-80">SCOREKEEPER</div>
          <h1 className="text-[26px] leading-[1.1] font-extrabold">We keep the score in check.</h1>
          <p className="text-sm font-medium opacity-85">You keep your eye on the shuttle.</p>
        </FrameCell>
        <FrameCell divider className="flex w-24 shrink-0 flex-col">
          <div className="flex-1 border-b-[1.5px] border-[var(--band-line)]" />
          <div className="flex flex-1 items-center justify-center">
            <FlipDigits size="md" tiles={['21', '18']} />
          </div>
        </FrameCell>
      </HeaderBand>

      {/* Only the in-progress card overlaps the band; otherwise content starts below it. */}
      <div className={`relative flex flex-col gap-[22px] px-4 ${showProgress ? '-mt-3.5' : 'mt-5'}`}>
        {showProgress && (
          <section
            aria-label="Game in progress"
            className="flex items-center gap-3 rounded-card bg-white p-3.5 shadow-[0_6px_20px_rgba(20,26,38,0.12)]"
          >
            <FlipDigits
              size="sm"
              label={`Score ${screenScore(court)}`}
              tiles={order.map((team) => ({
                value: court.teams[team].score,
                marker: TEAM_COLORS[config.teamColors[team]],
              }))}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="text-[11px] font-bold tracking-[0.2em] text-muted">IN PROGRESS</div>
              <div className="truncate text-sm font-bold">
                {MODE_NAME[config.mode]} · Game {game.gameNumber}
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate({ to: '/sports/badminton' })}
              className="h-11 shrink-0 rounded-control bg-band px-4 text-sm font-bold text-white active:opacity-80"
            >
              Resume
            </button>
          </section>
        )}

        <section className="flex flex-col gap-2.5">
          <h2 className={LABEL}>START A MATCH</h2>
          <div className="rounded-[20px] bg-court-inner p-2 text-white">
            <div className="flex flex-col gap-3.5 rounded-[13px] border-[1.5px] border-white/45 p-3.5">
              <div className="flex items-center gap-3">
                <BadmintonMark />
                <div className="flex flex-col gap-0.5">
                  <div className="text-sm font-extrabold tracking-[0.24em]">BADMINTON</div>
                  <div className="text-[13px] opacity-85">Rally scoring · 21 or 30</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(['singles', 'doubles'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => start(mode)}
                    className="h-[46px] rounded-control bg-white text-sm font-extrabold text-court-ink active:opacity-85"
                  >
                    {MODE_NAME[mode]}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex h-[52px] items-center justify-center rounded-2xl border-[1.5px] border-dashed border-line-dashed text-[13px] font-bold text-subtle">
            More sports coming soon
          </div>
        </section>

        <section className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <h2 className={LABEL}>RECENT MATCHES</h2>
            {history.entries.length > 0 && (
              <button
                type="button"
                onClick={() => setHistoryOpen(true)}
                className="-mr-2 h-11 rounded-control px-2 text-[13px] font-bold text-band-ink active:bg-soft"
              >
                See all
              </button>
            )}
          </div>
          {history.entries.length === 0 ? (
            <p className="rounded-2xl border-[1.5px] border-line px-4 py-5 text-center text-sm text-muted">
              No matches yet. Finished games show up here.
            </p>
          ) : (
            <div className="flex gap-2.5">
              {history.entries.slice(0, 2).map((entry) => (
                <RecentCard key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </section>
      </div>

      <footer className="mt-auto px-4 pt-5 pb-[max(16px,env(safe-area-inset-bottom))] text-center text-xs text-subtle">
        v{__APP_VERSION__} · Made by Bryan Hadinata
      </footer>

      <HistorySheet open={historyOpen} onClose={() => setHistoryOpen(false)} />

      <ConfirmDialog
        open={pendingMode !== null}
        tone="neutral"
        icon={<Rackets className="h-6 w-7" />}
        title="Start a new match?"
        description={
          <>
            There is an ongoing match on <strong className="text-ink">{screenScore(court)}</strong>, do you want to
            start a new {pendingMode} match?
          </>
        }
        confirmLabel={`Start new ${pendingMode} match`}
        cancelLabel="Keep current match"
        onConfirm={() => pendingMode && begin(pendingMode)}
        onCancel={() => setPendingMode(null)}
      />
    </div>
  )
}

const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'short' })
const dayMonth = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' })

// "Today", "Yesterday", a weekday within the last week, otherwise "9 Oct".
function relativeDay(t: number): string {
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((startOf(new Date()) - startOf(new Date(t))) / 86_400_000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return weekday.format(t)
  return dayMonth.format(t)
}

// Compact result of one finished game: mode and day, then both teams with their scores.
function RecentCard({ entry }: { entry: HistoryEntry }) {
  const mode = entry.left.players.length === 2 ? 'Doubles' : 'Singles'
  const draw = entry.winner === 'draw'
  const rows = [
    { side: entry.left, won: entry.winner === 'left' },
    { side: entry.right, won: entry.winner === 'right' },
  ]
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2 rounded-2xl border-[1.5px] border-line p-3">
      <div className="truncate text-xs font-semibold text-muted">
        {mode} · {relativeDay(entry.endedAt)}
        {draw && ' · Draw'}
      </div>
      {rows.map(({ side, won }, i) => (
        <div
          key={i}
          className={`flex justify-between gap-2 text-sm ${won ? 'font-extrabold' : draw ? 'font-bold text-ink' : 'font-semibold text-muted'}`}
          style={won ? { color: side.color ?? 'var(--color-ink)' } : undefined}
        >
          <span className="truncate">{side.players.map((p) => p.name).join(' / ')}</span>
          <span className="tabular-nums">{side.score}</span>
        </div>
      ))}
    </div>
  )
}
