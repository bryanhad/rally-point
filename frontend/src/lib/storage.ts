import type { z } from 'zod'

export type Loaded<T> = {
  value: T
  // 'missing': nothing stored yet. 'reset': something was stored but no longer parses.
  status: 'ok' | 'missing' | 'reset'
}

export function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    // Storage unavailable (e.g. blocked by the browser).
    return null
  }
}

export function loadStored<S extends z.ZodType>(
  key: string,
  schema: S,
  fallback: () => z.infer<S>,
): Loaded<z.infer<S>> {
  const raw = readStored(key)
  if (raw === null) return { value: fallback(), status: 'missing' }

  try {
    const result = schema.safeParse(JSON.parse(raw))
    if (result.success) return { value: result.data, status: 'ok' }
  } catch {
    // Not valid JSON; treated as reset below.
  }
  return { value: fallback(), status: 'reset' }
}

export function saveStored(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Quota exceeded or storage blocked; the app keeps working in memory.
  }
}
