import type { NoticeInput, NoticeScore } from '../../lib/notice'
import { EMPTY_SLOT, otherTeam, TEAM_IDS, teamOn, type CourtState, type LogStep } from './game'
import { TEAM_ON_DARK, type Config, type CourtView, type GameEvent, type TeamId } from './schema'
import { viewSide } from './view'

// The notifications the scoreboard shows (lib/notice.ts draws and merges them): Undo and Redo,
// the automatic change of ends, and a player joining the session. Pure, so the wording is easy
// to check. Titles stay short; the detail goes in the subtitle.

type NameOf = (id: string) => string
type Ctx = { name: NameOf; view: CourtView; colors: Config['teamColors'] }

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const teamName = (team: TeamId, colors: Config['teamColors']) => `Team ${titleCase(colors[team])}`

// The score in screen order (the team drawn on the left first), each in its colour for the dark
// card. The same order as the score buttons and the old toast text.
export function noticeScore(court: CourtState, view: CourtView, colors: Config['teamColors']): NoticeScore {
  const left = teamOn(court, viewSide('left', view))
  const chip = (team: TeamId) => ({ value: court.teams[team].score, color: TEAM_ON_DARK[colors[team]] })
  return [chip(left), chip(otherTeam(left))]
}

// For an assignPlayer that picked someone already on court: the two players who traded places
// and whether they were on different teams. Null for a plain replacement.
function swappedPair(event: Extract<GameEvent, { type: 'assignPlayer' }>, before: CourtState) {
  const was = before.teams[event.team].ids[event.slot]
  if (was === EMPTY_SLOT) return null
  const otherSide = TEAM_IDS.find((t) => before.teams[t].ids.includes(event.playerId))
  return otherSide ? { pair: [was, event.playerId] as const, crossTeams: otherSide !== event.team } : null
}

// Undo and Redo: rallies merge (consecutive ones count up while the card shows); every other
// kind replaces.
export function historyNotice(direction: 'undo' | 'redo', { event, before, after }: LogStep, { name, view, colors }: Ctx): NoticeInput {
  const undo = direction === 'undo'
  const base = { kind: 'neutral' as const, icon: direction }
  // The court as it is after the Undo/Redo.
  const court = undo ? before : after
  switch (event.type) {
    case 'rally':
      return {
        ...base,
        title: '',
        subtitle: '',
        score: noticeScore(court, view, colors),
        merge: {
          key: `${direction}-rally`,
          flag: !!event.swapEnds,
          render: (n, swapped) =>
            undo
              ? { title: n === 1 ? 'Undid rally' : `Undid ${n} rallies`, subtitle: `Back to${swapped ? ' · sides switched back' : ''}` }
              : { title: n === 1 ? 'Redid rally' : `Redid ${n} rallies`, subtitle: `Now${swapped ? ' · players switched sides' : ''}` },
        },
      }
    case 'swapEnds':
      return undo
        ? { ...base, title: 'Undid switch sides', subtitle: 'Players back on their old ends' }
        : { ...base, title: 'Redid switch sides', subtitle: 'Players switched sides' }
    case 'swapPartners': {
      const [x, y] = before.teams[event.team].ids
      return { ...base, title: `${name(x)} and ${name(y)} swapped ${undo ? 'back' : 'again'}`, subtitle: teamName(event.team, colors) }
    }
    case 'assignPlayer': {
      const swap = swappedPair(event, before)
      if (swap) {
        return {
          ...base,
          title: `${name(swap.pair[0])} and ${name(swap.pair[1])} swapped ${undo ? 'back' : 'again'}`,
          subtitle: swap.crossTeams ? 'Both teams' : teamName(event.team, colors),
        }
      }
      const was = before.teams[event.team].ids[event.slot]
      const put = name(after.teams[event.team].ids[event.slot])
      if (was === EMPTY_SLOT) {
        return undo
          ? { ...base, title: `Took ${put} off court`, subtitle: 'The spot is empty again' }
          : { ...base, title: `Put ${put} back on court`, subtitle: teamName(event.team, colors) }
      }
      return {
        ...base,
        title: undo ? `${put} changed back to ${name(was)}` : `${name(was)} changed to ${put} again`,
        subtitle: teamName(event.team, colors),
      }
    }
  }
}

// The automatic change of ends: nobody tapped anything, so it must be noticed. `reached`: the
// score that triggered it; `court`: the court after the point (and the swap).
export function changeEndsNotice(reached: number, court: CourtState, view: CourtView, colors: Config['teamColors']): NoticeInput {
  return {
    kind: 'attention',
    icon: 'change-ends',
    title: 'Change ends',
    subtitle: `Reached ${reached} · automatic`,
    score: noticeScore(court, view, colors),
  }
}

// A player added to the session without going on court. `satOut`: where they enter the queue
// (the Arrived field's live line); `players`: the session's player count after adding.
export function joinedNotice(names: string[], satOut: number, players: number): NoticeInput {
  const who = names.length === 1 ? `${names[0]} joined the session` : `${names.length} players joined the session`
  const counts = names.length === 1 ? 'Counts as' : 'Count as'
  return {
    kind: 'positive',
    icon: 'user-plus',
    title: who,
    subtitle: `${counts} ${satOut > 0 ? `sat out ${satOut}` : 'not played yet'} · ${players} ${players === 1 ? 'player' : 'players'}`,
  }
}
