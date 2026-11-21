// Notifications: one small card at a time at the top of the screen (components/ui/NoticeHost.tsx
// draws it). Every caller goes through notify(). A new event replaces the card that's showing;
// the same mergeable event (consecutive rally undos, or redos) updates it in place and counts up,
// but only while it's still showing.

export type NoticeKind = 'neutral' | 'attention' | 'destructive' | 'positive'
export type NoticeIcon = 'undo' | 'redo' | 'change-ends' | 'trash' | 'user-plus'
// The score, in the order it reads on screen, each number in its colour for the dark card.
export type NoticeScore = readonly [{ value: number; color: string }, { value: number; color: string }]

type Content = { title: string; subtitle: string }

export type NoticeInput = Content & {
  kind: NoticeKind
  icon: NoticeIcon
  score?: NoticeScore
  // Mergeable: the same key while the card shows bumps the count and redraws the text from
  // `render`. `flag` sticks for the whole run once any merged event had it (a rally in the run
  // that had switched sides).
  merge?: { key: string; flag?: boolean; render: (count: number, flagged: boolean) => Content }
}

export type Notice = Content & {
  // Changes only when the card is replaced (a merge keeps it).
  id: number
  kind: NoticeKind
  icon: NoticeIcon
  score?: NoticeScore
  // Merged events (1 when not merged).
  count: number
  mergeKey?: string
  flagged: boolean
  render?: (count: number, flagged: boolean) => Content
}

// What's showing after `input` arrives while `current` shows (null: nothing showing).
export function applyNotice(current: Notice | null, input: NoticeInput, nextId: number): Notice {
  const { merge, ...rest } = input
  if (current && merge && current.mergeKey === merge.key) {
    const count = current.count + 1
    const flagged = current.flagged || !!merge.flag
    return { ...current, ...rest, ...merge.render(count, flagged), count, flagged, render: merge.render }
  }
  const flagged = !!merge?.flag
  return {
    ...rest,
    ...(merge ? merge.render(1, flagged) : {}),
    id: nextId,
    count: 1,
    mergeKey: merge?.key,
    flagged,
    render: merge?.render,
  }
}

// The sentence screen readers get: "Undid 3 rallies, back to 17–18, sides switched back". The
// score follows "Back to" / "Now" when the subtitle starts with one, otherwise it ends the sentence.
export function noticeSentence(n: Pick<Notice, 'title' | 'subtitle' | 'score'>): string {
  const score = n.score ? `${n.score[0].value}–${n.score[1].value}` : ''
  const parts = n.subtitle ? n.subtitle.split(' · ').map((p) => p.charAt(0).toLowerCase() + p.slice(1)) : []
  if (score && parts.length > 0 && /^(back to|now)$/.test(parts[0])) parts[0] = `${parts[0]} ${score}`
  else if (score) parts.push(score)
  return [n.title, ...parts].join(', ')
}

// --- The store ------------------------------------------------------------------------------

let current: Notice | null = null
let lastId = 0
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function notify(input: NoticeInput) {
  current = applyNotice(current, input, lastId + 1)
  lastId = Math.max(lastId, current.id)
  emit()
}

// The card leaves (timed out, tapped, swiped, or a GAME POINT / DEUCE toast is coming). The
// next event starts fresh (a merge never reaches a card that has gone).
export function dismissNotice() {
  if (!current) return
  current = null
  emit()
}

export function subscribeNotice(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const getNotice = () => current
