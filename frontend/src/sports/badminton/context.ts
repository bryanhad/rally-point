import { createContext, useContext, type Dispatch, type SetStateAction } from 'react'
import type { CourtState, GameAction, LogStep } from './game'
import type { Config, GameState, History, HistoryEntry } from './schema'

export type BadmintonContextValue = {
  game: GameState
  court: CourtState
  steps: LogStep[]
  dispatch: Dispatch<GameAction>
  config: Config
  setConfig: Dispatch<SetStateAction<Config>>
  history: History
  addHistoryEntry: (entry: HistoryEntry) => void
  clearHistory: () => void
  // Stored keys that no longer parsed and were reset on load.
  resetNotice: ResetKey[]
  dismissResetNotice: () => void
}

export type ResetKey = 'game' | 'players' | 'config' | 'history'

export const BadmintonContext = createContext<BadmintonContextValue | null>(null)

export function useBadminton() {
  const ctx = useContext(BadmintonContext)
  if (!ctx) throw new Error('useBadminton must be used inside <BadmintonProvider>')
  return ctx
}
