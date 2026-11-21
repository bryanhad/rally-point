import { describe, expect, it } from 'vitest'
import { applyNotice, dismissNotice, getNotice, noticeSentence, notify, type NoticeInput } from './notice'

const undoRally = (flag = false, score = 10): NoticeInput => ({
  kind: 'neutral',
  icon: 'undo',
  title: '',
  subtitle: '',
  score: [
    { value: score, color: 'red' },
    { value: 7, color: 'blue' },
  ],
  merge: {
    key: 'undo-rally',
    flag,
    render: (n, flagged) => ({
      title: n === 1 ? 'Undid rally' : `Undid ${n} rallies`,
      subtitle: `Back to${flagged ? ' · sides switched back' : ''}`,
    }),
  },
})
const redoRally: NoticeInput = {
  ...undoRally(),
  icon: 'redo',
  merge: { key: 'redo-rally', render: (n) => ({ title: n === 1 ? 'Redid rally' : `Redid ${n} rallies`, subtitle: 'Now' }) },
}
const plain: NoticeInput = { kind: 'neutral', icon: 'undo', title: 'Undid switch sides', subtitle: 'Players back on their old ends' }

describe('applyNotice (merge rules)', () => {
  it('consecutive rally undos merge into one card that counts up, with the latest score', () => {
    const one = applyNotice(null, undoRally(false, 12), 1)
    const two = applyNotice(one, undoRally(false, 11), 2)
    const three = applyNotice(two, undoRally(false, 10), 3)
    expect(three).toMatchObject({ id: 1, count: 3, title: 'Undid 3 rallies', subtitle: 'Back to' })
    expect(three.score?.[0].value).toBe(10)
  })

  it('a rally in the run that had switched sides keeps "sides switched back" for the run', () => {
    const one = applyNotice(null, undoRally(true), 1)
    const two = applyNotice(one, undoRally(false), 2)
    expect(two.subtitle).toBe('Back to · sides switched back')
  })

  it('undo then redo replaces the card and the count restarts', () => {
    const undone = applyNotice(applyNotice(null, undoRally(), 1), undoRally(), 2)
    const redone = applyNotice(undone, redoRally, 3)
    expect(redone).toMatchObject({ id: 3, count: 1, title: 'Redid rally' })
  })

  it('other kinds replace (and never merge with each other)', () => {
    const a = applyNotice(null, plain, 1)
    const b = applyNotice(a, plain, 2)
    expect(b).toMatchObject({ id: 2, count: 1 })
    expect(applyNotice(b, undoRally(), 3)).toMatchObject({ id: 3, count: 1, title: 'Undid rally' })
  })
})

describe('the store', () => {
  it('a merge after the card has left starts at 1', () => {
    notify(undoRally())
    notify(undoRally())
    expect(getNotice()?.count).toBe(2)
    dismissNotice()
    expect(getNotice()).toBeNull()
    notify(undoRally())
    expect(getNotice()).toMatchObject({ count: 1, title: 'Undid rally' })
    dismissNotice()
  })
})

describe('noticeSentence', () => {
  it('title, subtitle and score as one sentence', () => {
    expect(noticeSentence({ title: 'Undid 3 rallies', subtitle: 'Back to', score: undoRally(false, 17).score })).toBe(
      'Undid 3 rallies, back to 17–7',
    )
    expect(noticeSentence(plain)).toBe('Undid switch sides, players back on their old ends')
    expect(noticeSentence({ title: 'Undid rally', subtitle: 'Back to · sides switched back', score: undoRally(false, 10).score })).toBe(
      'Undid rally, back to 10–7, sides switched back',
    )
    expect(noticeSentence({ title: 'Change ends', subtitle: 'Reached 11 · automatic', score: undoRally(false, 11).score })).toBe(
      'Change ends, reached 11, automatic, 11–7',
    )
  })
})
