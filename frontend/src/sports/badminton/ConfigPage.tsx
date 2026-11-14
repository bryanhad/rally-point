import { Link } from '@tanstack/react-router'
import type { CSSProperties } from 'react'
import { BandCaption, FrameCell, HeaderBand } from '../../components/ui/HeaderBand'
import { BackIcon, GearIcon, SwapIcon } from '../../components/ui/icons'
import { Card, SectionLabel } from '../../components/ui/primitives'
import { useBadminton } from './context'
import { otherTeam } from './game'
import { TEAM_COLORS, type TeamColor, type TeamId } from './schema'

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// Display settings only. Game rules are edited from the scoreboard's rules tile, and players
// from its players tile.
export function ConfigPage() {
  const { config, setConfig, court } = useBadminton()

  // Live scores in screen order for the thickness preview.
  const previewTeams: TeamId[] = [court.leftTeam, otherTeam(court.leftTeam)]

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
          <h1 className="text-xl font-extrabold">Display</h1>
        </FrameCell>
        <FrameCell divider className="flex w-[72px] items-center justify-center text-flip-digit">
          <GearIcon size={28} />
        </FrameCell>
      </HeaderBand>

      {/* Not designed for tablets: a centred column there instead of stretching. */}
      <div className="flex flex-col gap-3 px-3 pt-4 pb-6 tablet:mx-auto tablet:w-full tablet:max-w-160 tablet:px-6">
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
      </div>
    </div>
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
