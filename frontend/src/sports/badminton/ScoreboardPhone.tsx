import { Link } from '@tanstack/react-router'
import { HeaderBand } from '../../components/ui/HeaderBand'
import { AlertIcon, BackIcon, FlagIcon, GearIcon, RedoIcon, ResetIcon, TrophyIcon, UndoIcon } from '../../components/ui/icons'
import { Button } from '../../components/ui/primitives'
import { initials } from './avatarStyle'
import { Court } from './Court'
import { GamePointBadge, GamePointToast } from './GamePointToast'
import { EMPTY_SLOT, screenScore, teamOn, type SideKey } from './game'
import { TEAM_COLORS, type TeamId } from './schema'
import { ModeSwitch, NoSessionOverlay, PickOverlay, RulesTile, SessionTile } from './ScoreboardParts'
import { colorName, type ScoreboardView } from './scoreboardView'

const SIDES: SideKey[] = ['left', 'right']

export const BAND_ICON_LINK = 'flex size-11 items-center justify-center rounded-control text-white active:bg-white/15'

// Phone scoreboard: band, court with its controls, game actions, score buttons, rallies strip.
export function ScoreboardPhone({ v, className = '' }: { v: ScoreboardView; className?: string }) {
  const { court, config, session } = v
  const nameOf = (id: string) => v.byId.get(id)?.name ?? '?'
  const teamInitials = (team: TeamId) =>
    court.teams[team].ids.map((id) => (id === EMPTY_SLOT ? '?' : initials(nameOf(id)))).join(' · ')
  const newestRally = v.rallies[0]?.number

  return (
    <div className={`flex-1 flex-col ${className}`}>
      <HeaderBand
        // The match type switch takes the title's place (Back and the court say where you are).
        title={<ModeSwitch mode={config.mode} onMode={v.onMode} />}
        spacing="tight"
        framed={false}
        left={
          <Link to="/" aria-label="Back to home" className={BAND_ICON_LINK}>
            <BackIcon />
          </Link>
        }
        right={
          <Link to="/sports/badminton/config" aria-label="Badminton settings" className={BAND_ICON_LINK}>
            <GearIcon />
          </Link>
        }
      >
        <SessionTile session={session} players={v.players} onClick={v.onOpenSession} />
        <RulesTile config={config} onClick={v.onOpenRules} />
      </HeaderBand>

      {/* pt leaves room for the ⇆ button sticking out above the court. */}
      <div className="flex flex-1 flex-col px-3 pt-7 pb-2">
        <Court
          court={court}
          byId={v.byId}
          colors={config.teamColors}
          onPick={v.onPick}
          onSwapPartners={v.onSwapPartners}
          onSwapSides={v.onSides}
          onChangeServer={v.started ? undefined : v.onServer}
          glow={v.gamePoint && { team: v.gamePoint.team, fast: !!v.gamePoint.toast }}
          toast={
            v.gamePoint?.toast && (
              <GamePointToast key={v.gamePoint.toast.id} toast={v.gamePoint.toast} color={config.teamColors[v.gamePoint.team]} dim />
            )
          }
          overlay={
            !session ? (
              <NoSessionOverlay onStart={v.onNewSession} />
            ) : v.pickPending ? (
              <PickOverlay
                gameNumber={v.gameNumber ?? 1}
                same={v.sameLineup}
                onPick={v.onPickPlayers}
                onSame={v.onSamePlayers}
              />
            ) : undefined
          }
        />

        {/* Game actions: history controls on the left, reset/end on the right */}
        <div className="mb-2 flex shrink-0 items-center justify-between">
          <div className="flex gap-1.5">
            <Button icon={<UndoIcon />} label="Undo" onClick={v.onUndo} disabled={!v.canUndo} />
            <Button aria-label="Redo" icon={<RedoIcon />} onClick={v.onRedo} disabled={!v.canRedo} />
          </div>
          <div className="flex gap-1.5">
            <Button aria-label="Reset game" icon={<ResetIcon />} onClick={v.onReset} disabled={!v.canUndo} />
            {/* Only once a team has reached the total (e.g. after choosing Keep playing). */}
            <button
              type="button"
              onClick={v.onEnd}
              disabled={v.blocked || !v.reachedTotal || v.emptySpot}
              title={v.reachedTotal ? undefined : `Available once a team reaches ${config.totalPoints}`}
              className="flex h-11 items-center gap-1.5 rounded-control bg-ink px-3 text-[13px] font-bold text-white active:opacity-75 disabled:border-[1.5px] disabled:border-dashed disabled:border-line-strong disabled:bg-white disabled:text-faint"
            >
              <FlagIcon />
              End game
            </button>
          </div>
        </div>

        {!v.blocked && v.emptySpot && (
          <p className="-mt-0.5 mb-1.5 flex h-[22px] shrink-0 items-center justify-center gap-1.5 text-xs font-bold text-muted">
            <AlertIcon size={14} />
            Fill every spot on the court to keep scoring
          </p>
        )}

        {/* Scores: tapping a side records a rally won by the team on that side */}
        <div className="flex min-h-[60px] flex-1 gap-2.5">
          {SIDES.map((side) => {
            const team = teamOn(court, side)
            const gamePoint = v.gamePoint?.team === team
            return (
              <button
                key={side}
                type="button"
                onClick={() => v.onRally(team)}
                // Without a session the tap opens New session instead.
                disabled={session !== null && (v.pickPending || v.emptySpot)}
                aria-label={`Point to Team ${colorName(config, team)}${gamePoint ? '. Game point' : ''}`}
                className="relative flex flex-1 flex-col items-center justify-center gap-1 rounded-[22px] text-white select-none enabled:active:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
                style={{ backgroundColor: TEAM_COLORS[config.teamColors[team]], containerType: 'size' }}
              >
                <span
                  className="text-[min(52cqh,44cqw)] leading-none tabular-nums"
                  style={{ fontWeight: config.thickness }}
                >
                  {court.teams[team].score}
                </span>
                <span className="text-xs font-bold tracking-[0.14em] opacity-90">{teamInitials(team)}</span>
                {gamePoint && <GamePointBadge />}
              </button>
            )
          })}
        </div>

        {/* Rallies strip (newest on the left); match history opens in a sheet */}
        <div className="mt-1.5 flex shrink-0 flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-bold tracking-[0.06em] text-muted">RALLIES</h2>
            <Button
              tone="ghost"
              className="px-2 text-band-ink"
              icon={<TrophyIcon />}
              label="Match history"
              onClick={v.onOpenHistory}
            />
          </div>
          {v.rallies.length > 0 ? (
            <div className="scrollbar-always flex gap-1.5 overflow-x-auto p-1 pb-1.5">
              {v.rallies.map(({ step, number }) => (
                <button
                  key={number}
                  type="button"
                  onClick={() => v.onOpenRally(number)}
                  aria-label={`Rally ${number}: ${screenScore(step.after)}`}
                  className={`flex h-8 shrink-0 items-center rounded-[9px] px-3 text-sm font-extrabold text-white tabular-nums active:opacity-80 ${
                    number === newestRally ? 'shadow-[0_0_0_2px_#fff,0_0_0_4px_var(--color-ink)]' : ''
                  }`}
                  style={{ backgroundColor: TEAM_COLORS[config.teamColors[step.event.winner]] }}
                >
                  {screenScore(step.after)}
                </button>
              ))}
            </div>
          ) : (
            <p className="flex h-10 items-center text-sm text-faint">Tap a team's score to log the first rally</p>
          )}
        </div>
      </div>
    </div>
  )
}
