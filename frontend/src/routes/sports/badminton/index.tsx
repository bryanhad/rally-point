import { createFileRoute } from '@tanstack/react-router'
import { Scoreboard } from '../../../sports/badminton/Scoreboard'

// Optional one-shot requests from home: open Pick players (in a format) or the Current Session
// sheet. The scoreboard acts on them once and clears them from the URL.
export type ScoreboardSearch = { open?: 'pick' | 'session'; mode?: 'singles' | 'doubles' }

export const Route = createFileRoute('/sports/badminton/')({
  validateSearch: (search: Record<string, unknown>): ScoreboardSearch => ({
    open: search.open === 'pick' || search.open === 'session' ? search.open : undefined,
    mode: search.mode === 'singles' || search.mode === 'doubles' ? search.mode : undefined,
  }),
  component: Scoreboard,
})
