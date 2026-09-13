import { describe, expect, test, afterEach } from 'bun:test'
import { search } from '../../src/query/search'
import { loadIndex } from '../../src/index/persist'
import { makeRepo, type Repo } from '../helpers/makeRepo'

let repo: Repo | null = null
afterEach(() => {
  repo?.cleanup()
  repo = null
})

describe('search', () => {
  test('returns hits score-descending', () => {
    repo = makeRepo([
      { id: 'rule-a', type: 'rule', title: 'Cancellation window' },
      { id: 'rule-b', type: 'rule', title: 'Unrelated', body: 'cancellation appears once' },
    ])
    const out = search(loadIndex(repo.memRoot), 'cancellation')
    expect(out.map((h) => h.doc.id)).toEqual(['rule-a', 'rule-b'])
  })

  test('honours the limit', () => {
    repo = makeRepo([
      { id: 'rule-a', type: 'rule', title: 'Cancellation one' },
      { id: 'rule-b', type: 'rule', title: 'Cancellation two' },
    ])
    expect(search(loadIndex(repo.memRoot), 'cancellation', { limit: 1 }).length).toBe(1)
  })

  test('an unmatched query returns an empty array, never throws', () => {
    repo = makeRepo([{ id: 'rule-a', type: 'rule', title: 'Cancellation' }])
    expect(search(loadIndex(repo.memRoot), 'quantum tunnelling')).toEqual([])
  })

  test('an empty memory returns an empty array', () => {
    repo = makeRepo([])
    expect(search(loadIndex(repo.memRoot), 'anything')).toEqual([])
  })
})
