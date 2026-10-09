import { useCallback, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react'
import { z } from 'zod'
import { loadStored, readStored, saveStored } from '../../lib/storage'
import { BadmintonContext, type ResetKey } from './context'
import { fixTeamColors, gameReducer, repairGame, replay } from './game'
import {
  CONFIG_KEY,
  GAME_KEY,
  HISTORY_KEY,
  PLAYERS_KEY,
  configSchema,
  defaultConfig,
  defaultGame,
  defaultHistory,
  historySchema,
  playerSchema,
  playersSchema,
  storedGameSchema,
  type HistoryEntry,
  type Player,
} from './schema'

// Before the roster had its own key, custom players were stored inside the game key.
function readLegacyPlayers(): Player[] {
  try {
    const legacy = z
      .object({ players: z.array(playerSchema) })
      .safeParse(JSON.parse(readStored(GAME_KEY) ?? 'null'))
    return legacy.success ? legacy.data.players : []
  } catch {
    return []
  }
}

function loadInitial() {
  const game = loadStored(GAME_KEY, storedGameSchema, () => {
    const { start, log, redoLog, gameNumber } = defaultGame()
    return { start, log, redoLog, gameNumber }
  })
  const roster = loadStored(PLAYERS_KEY, playersSchema, () => ({ players: [] }))
  const config = loadStored(CONFIG_KEY, configSchema, defaultConfig)
  const history = loadStored(HISTORY_KEY, historySchema, defaultHistory)

  const players = roster.status === 'missing' ? readLegacyPlayers() : roster.value.players

  // Listed in the order the reset notice shows them.
  const reset: ResetKey[] = []
  if (game.status === 'reset') reset.push('game')
  if (roster.status === 'reset') reset.push('players')
  if (config.status === 'reset') reset.push('config')
  if (history.status === 'reset') reset.push('history')

  return {
    // On-court ids missing from the roster fall back to free defaults.
    game: repairGame({ ...game.value, players }, config.value.mode),
    config: { ...config.value, teamColors: fixTeamColors(config.value.teamColors) },
    history: history.value,
    reset,
  }
}

export function BadmintonProvider({ children }: { children: ReactNode }) {
  // Read storage once; each key is validated independently.
  const [initial] = useState(loadInitial)

  const [game, dispatch] = useReducer(gameReducer, initial.game)
  const [config, setConfig] = useState(initial.config)
  const [history, setHistory] = useState(initial.history)
  const [resetNotice, setResetNotice] = useState(initial.reset)

  // Score, server, positions and ends are derived from the game log.
  const { court, steps } = useMemo(() => replay(game), [game])

  // Saving on every change also overwrites unusable data with the fresh state.
  // The game and roster share one reducer but are saved to separate keys.
  useEffect(
    () =>
      saveStored(GAME_KEY, {
        start: game.start,
        log: game.log,
        redoLog: game.redoLog,
        gameNumber: game.gameNumber,
      }),
    [game.start, game.log, game.redoLog, game.gameNumber],
  )
  useEffect(() => saveStored(PLAYERS_KEY, { players: game.players }), [game.players])
  useEffect(() => saveStored(CONFIG_KEY, config), [config])
  useEffect(() => saveStored(HISTORY_KEY, history), [history])

  const addHistoryEntry = useCallback(
    (entry: HistoryEntry) => setHistory((h) => ({ ...h, entries: [entry, ...h.entries] })),
    [],
  )

  const clearHistory = useCallback(() => setHistory((h) => ({ ...h, entries: [] })), [])

  const value = useMemo(
    () => ({
      game,
      court,
      steps,
      dispatch,
      config,
      setConfig,
      history,
      addHistoryEntry,
      clearHistory,
      resetNotice,
      dismissResetNotice: () => setResetNotice([]),
    }),
    [game, court, steps, config, history, addHistoryEntry, clearHistory, resetNotice],
  )

  return <BadmintonContext.Provider value={value}>{children}</BadmintonContext.Provider>
}
