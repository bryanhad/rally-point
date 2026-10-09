// crypto.randomUUID only exists in secure contexts (https or localhost), so it is
// missing when the dev server is opened from a phone over the LAN.
export function newId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
