import { describe, expect, test, afterEach } from 'bun:test'
import { scoreDoc, scoreDocs, maxPossibleScore } from '../../src/domain/scoring'
import { tokenize } from '../../src/domain/text'
import { WEIGHTS } from '../../src/domain/constants'
import { loadIndex } from '../../src/index/persist'
import { makeRepo, type Repo } from '../helpers/makeRepo'
import type { IndexedDoc } from '../../src/domain/types'

function doc(over: Partial<IndexedDoc>): IndexedDoc {
  return {
    id: 'rule-x', type: 'rule', title: 'Title', tags: [], refs: [], links: [],
    status: 'active', supersededBy: null, created: '2026-01-01',
    path: 'rules/rule-x.md', hash: 'sha256:0', body: '',
    ...over,
  }
}

let repo: Repo | null = null
afterEach(() => {
  repo?.cleanup()
  repo = null
})

describe('scoreDoc', () => {
  test('an empty query scores zero', () => {
    expect(scoreDoc(doc({ title: 'anything' }), [])).toBe(0)
  })

  test('a title match outweighs a body match', () => {
    const inTitle = scoreDoc(doc({ title: 'cancellation' }), tokenize('cancellation'))
    const inBody = scoreDoc(doc({ title: 'other', body: 'cancellation' }), tokenize('cancellation'))
    expect(inTitle).toBeGreaterThan(inBody)
  })

  test('tags and refs weigh the same and sit between title and body', () => {
    const t = scoreDoc(doc({ title: 'z', tags: ['cancellation'] }), tokenize('cancellation'))
    const r = scoreDoc(doc({ title: 'z', refs: ['cancellation'] }), tokenize('cancellation'))
    const b = scoreDoc(doc({ title: 'z', body: 'cancellation' }), tokenize('cancellation'))
    const ti = scoreDoc(doc({ title: 'cancellation' }), tokenize('cancellation'))
    expect(t).toBe(r)
    expect(t).toBeGreaterThan(b)
    expect(ti).toBeGreaterThan(t)
  })

  test('body hits are capped', () => {
    const five = scoreDoc(doc({ title: 'z', body: 'x x x x x'.replace(/x/g, 'cancellation') }), tokenize('cancellation'))
    const fifty = scoreDoc(doc({ title: 'z', body: Array(50).fill('cancellation').join(' ') }), tokenize('cancellation'))
    expect(fifty).toBeLessThanOrEqual(five)
  })

  test('coverage favours a doc matching more distinct query terms', () => {
    const both = scoreDoc(doc({ title: 'policy cancellation' }), tokenize('policy cancellation'))
    const one = scoreDoc(doc({ title: 'policy policy policy' }), tokenize('policy cancellation'))
    expect(both).toBeGreaterThan(one)
  })

  test('length normalization keeps a long feature from outranking a short rule', () => {
    const rule = scoreDoc(doc({ title: 'cancellation' }), tokenize('cancellation'))
    const feature = scoreDoc(
      doc({ type: 'feature', title: 'cancellation', body: Array(2000).fill('filler').join(' ') }),
      tokenize('cancellation'),
    )
    expect(rule).toBeGreaterThan(feature)
  })

  test('matches a code symbol through identifier splitting', () => {
    const d = doc({ title: 'z', refs: ['PolicyCancellationService'] })
    expect(scoreDoc(d, tokenize('cancellation'))).toBeGreaterThan(0)
    expect(scoreDoc(d, tokenize('PolicyCancellationService'))).toBeGreaterThan(0)
  })

  test('is accent insensitive in both directions', () => {
    const d = doc({ title: 'Cancelación de póliza' })
    expect(scoreDoc(d, tokenize('cancelacion'))).toBeGreaterThan(0)
    expect(scoreDoc(doc({ title: 'cancelacion' }), tokenize('Cancelación'))).toBeGreaterThan(0)
  })
})

describe('maxPossibleScore', () => {
  test('equals a perfect title match', () => {
    const q = tokenize('open claims restriction')
    expect(maxPossibleScore(q)).toBe(q.length * WEIGHTS.title)
    expect(scoreDoc(doc({ title: 'open claims restriction' }), q)).toBeCloseTo(maxPossibleScore(q), 6)
  })
})

describe('scoreDocs', () => {
  test('returns only documents above zero, score-descending', () => {
    repo = makeRepo([
      { id: 'rule-a', type: 'rule', title: 'Cancellation window' },
      { id: 'rule-b', type: 'rule', title: 'Cancellation of policy', body: 'cancellation' },
      { id: 'rule-c', type: 'rule', title: 'Unrelated' },
    ])
    const out = scoreDocs(loadIndex(repo.memRoot), 'cancellation')
    expect(out.map((s) => s.doc.id)).not.toContain('rule-c')
    expect(out[0]!.score).toBeGreaterThanOrEqual(out[1]!.score)
    expect(out.every((s) => s.origin === 'seed')).toBe(true)
  })

  test('excludes superseded documents by default', () => {
    repo = makeRepo([
      { id: 'rule-a', type: 'rule', title: 'Cancellation', status: 'superseded', superseded_by: 'rule-b' },
      { id: 'rule-b', type: 'rule', title: 'Cancellation new' },
    ])
    const idx = loadIndex(repo.memRoot)
    expect(scoreDocs(idx, 'cancellation').map((s) => s.doc.id)).toEqual(['rule-b'])
    expect(scoreDocs(idx, 'cancellation', { includeSuperseded: true }).length).toBe(2)
  })

  test('can be restricted to one type and exclude one id', () => {
    repo = makeRepo([
      { id: 'rule-a', type: 'rule', title: 'Cancellation' },
      { id: 'dec-b', type: 'decision', title: 'Cancellation' },
    ])
    const idx = loadIndex(repo.memRoot)
    expect(scoreDocs(idx, 'cancellation', { type: 'rule' }).map((s) => s.doc.id)).toEqual(['rule-a'])
    expect(scoreDocs(idx, 'cancellation', { excludeId: 'rule-a' }).map((s) => s.doc.id)).toEqual(['dec-b'])
  })

  test('breaks ties by id ascending', () => {
    repo = makeRepo([
      { id: 'rule-zz', type: 'rule', title: 'Cancellation' },
      { id: 'rule-aa', type: 'rule', title: 'Cancellation' },
    ])
    expect(scoreDocs(loadIndex(repo.memRoot), 'cancellation').map((s) => s.doc.id)).toEqual([
      'rule-aa',
      'rule-zz',
    ])
  })
})
