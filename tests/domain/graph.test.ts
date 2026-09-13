import { describe, expect, test, afterEach } from 'bun:test'
import { neighbors, degree, expand } from '../../src/domain/graph'
import { loadIndex } from '../../src/index/persist'
import { makeRepo, type Repo } from '../helpers/makeRepo'
import type { MemoryIndex, ScoredDoc } from '../../src/domain/types'

let repo: Repo | null = null
afterEach(() => {
  repo?.cleanup()
  repo = null
})

function seed(index: MemoryIndex, id: string, score: number): ScoredDoc {
  return { doc: index.file.docs[id]!, score, origin: 'seed' }
}

describe('neighbors', () => {
  test('is undirected: outgoing links and backlinks both count', () => {
    repo = makeRepo([
      { id: 'rule-a', type: 'rule', links: ['dec-b'] },
      { id: 'dec-b', type: 'decision' },
    ])
    const idx = loadIndex(repo.memRoot)
    expect(neighbors(idx, 'rule-a')).toEqual(['dec-b'])
    expect(neighbors(idx, 'dec-b')).toEqual(['rule-a'])
  })

  test('drops links to documents that do not exist', () => {
    repo = makeRepo([{ id: 'rule-a', type: 'rule', links: ['ghost-x'] }])
    expect(neighbors(loadIndex(repo.memRoot), 'rule-a')).toEqual([])
  })

  test('deduplicates a mutual link', () => {
    repo = makeRepo([
      { id: 'rule-a', type: 'rule', links: ['dec-b'] },
      { id: 'dec-b', type: 'decision', links: ['rule-a'] },
    ])
    expect(neighbors(loadIndex(repo.memRoot), 'rule-a')).toEqual(['dec-b'])
  })
})

describe('degree', () => {
  test('counts undirected neighbours and is at least 1', () => {
    repo = makeRepo([
      { id: 'feature-hub', type: 'feature', links: ['rule-a', 'rule-b'] },
      { id: 'rule-a', type: 'rule' },
      { id: 'rule-b', type: 'rule' },
      { id: 'rule-lonely', type: 'rule' },
    ])
    const idx = loadIndex(repo.memRoot)
    expect(degree(idx, 'feature-hub')).toBe(2)
    expect(degree(idx, 'rule-lonely')).toBe(1)
  })
})

describe('expand', () => {
  test('returns one-hop neighbours marked related', () => {
    repo = makeRepo([
      { id: 'rule-a', type: 'rule', links: ['dec-b'] },
      { id: 'dec-b', type: 'decision' },
    ])
    const idx = loadIndex(repo.memRoot)
    const out = expand(idx, [seed(idx, 'rule-a', 10)])
    expect(out.map((s) => s.doc.id)).toEqual(['dec-b'])
    expect(out[0]!.origin).toBe('related')
  })

  test('never returns a document that is already a seed', () => {
    repo = makeRepo([
      { id: 'rule-a', type: 'rule', links: ['dec-b'] },
      { id: 'dec-b', type: 'decision' },
    ])
    const idx = loadIndex(repo.memRoot)
    const out = expand(idx, [seed(idx, 'rule-a', 10), seed(idx, 'dec-b', 9)])
    expect(out).toEqual([])
  })

  test('does not go two hops', () => {
    repo = makeRepo([
      { id: 'rule-a', type: 'rule', links: ['dec-b'] },
      { id: 'dec-b', type: 'decision', links: ['flow-c'] },
      { id: 'flow-c', type: 'flow' },
    ])
    const idx = loadIndex(repo.memRoot)
    expect(expand(idx, [seed(idx, 'rule-a', 10)]).map((s) => s.doc.id)).toEqual(['dec-b'])
  })

  test('caps neighbours per seed', () => {
    repo = makeRepo([
      { id: 'feature-hub', type: 'feature', links: ['rule-a', 'rule-b', 'rule-c', 'rule-d', 'rule-e'] },
      { id: 'rule-a', type: 'rule' }, { id: 'rule-b', type: 'rule' },
      { id: 'rule-c', type: 'rule' }, { id: 'rule-d', type: 'rule' },
      { id: 'rule-e', type: 'rule' },
    ])
    const idx = loadIndex(repo.memRoot)
    expect(expand(idx, [seed(idx, 'feature-hub', 10)]).length).toBe(3)
  })

  test('penalises high-degree neighbours', () => {
    repo = makeRepo([
      { id: 'rule-seed', type: 'rule', links: ['dec-quiet', 'feature-hub'] },
      { id: 'dec-quiet', type: 'decision' },
      { id: 'feature-hub', type: 'feature', links: ['rule-x', 'rule-y', 'rule-z'] },
      { id: 'rule-x', type: 'rule' }, { id: 'rule-y', type: 'rule' }, { id: 'rule-z', type: 'rule' },
    ])
    const idx = loadIndex(repo.memRoot)
    const out = expand(idx, [seed(idx, 'rule-seed', 10)])
    const quiet = out.find((s) => s.doc.id === 'dec-quiet')!
    const hub = out.find((s) => s.doc.id === 'feature-hub')!
    expect(quiet.score).toBeGreaterThan(hub.score)
  })

  test('keeps the highest weight when two seeds reach the same neighbour', () => {
    repo = makeRepo([
      { id: 'rule-a', type: 'rule', links: ['dec-shared'] },
      { id: 'rule-b', type: 'rule', links: ['dec-shared'] },
      { id: 'dec-shared', type: 'decision' },
    ])
    const idx = loadIndex(repo.memRoot)
    const out = expand(idx, [seed(idx, 'rule-a', 10), seed(idx, 'rule-b', 2)])
    expect(out.length).toBe(1)
    expect(out[0]!.score).toBeCloseTo((10 * 0.4) / Math.sqrt(2), 6)
  })

  test('excludes superseded neighbours by default', () => {
    repo = makeRepo([
      { id: 'rule-a', type: 'rule', links: ['rule-old'] },
      { id: 'rule-old', type: 'rule', status: 'superseded', superseded_by: 'rule-a' },
    ])
    const idx = loadIndex(repo.memRoot)
    expect(expand(idx, [seed(idx, 'rule-a', 10)])).toEqual([])
    expect(expand(idx, [seed(idx, 'rule-a', 10)], { includeSuperseded: true }).length).toBe(1)
  })

  test('an empty seed list expands to nothing', () => {
    repo = makeRepo([{ id: 'rule-a', type: 'rule' }])
    expect(expand(loadIndex(repo.memRoot), [])).toEqual([])
  })
})
