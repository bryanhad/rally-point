import { z } from 'zod'
import { loadStored, saveStored } from './storage'

// The sport whose scoreboard was used most recently; the home page shows its game in progress.
// Add new sports to this list as they are built.
export const SPORTS = ['badminton'] as const
export type Sport = (typeof SPORTS)[number]

const KEY = 'rally-point:last-sport'
const schema = z.enum(SPORTS).nullable()

export function readLastSport(): Sport | null {
  return loadStored(KEY, schema, () => null).value
}

export function writeLastSport(sport: Sport) {
  saveStored(KEY, sport)
}
