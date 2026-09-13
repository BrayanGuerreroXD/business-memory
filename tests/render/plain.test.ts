import { describe, expect, test } from 'bun:test'
import { renderSearch, renderList, renderShow } from '../../src/render/plain'
import type { IndexedDoc } from '../../src/domain/types'

function doc(over: Partial<IndexedDoc>): IndexedDoc {
  return {
    id: 'rule-x', type: 'rule', title: 'Title', tags: ['policies'], refs: [], links: [],
    status: 'active', supersededBy: null, created: '2026-09-01',
    path: 'rules/rule-x.md', hash: 'sha256:0', body: 'Body.',
    ...over,
  }
}

describe('renderSearch', () => {
  test('lists hits with id and title', () => {
    const out = renderSearch('cancel', [{ doc: doc({}), score: 3, origin: 'seed' }], 42)
    expect(out).toContain('rule-x — Title')
  })

  test('an empty result still prints a usable line', () => {
    const out = renderSearch('nothing', [], 42)
    expect(out).toContain('0 results for "nothing" (42 docs indexed)')
    expect(out).toContain('pm list --type rule')
  })
})

describe('renderList', () => {
  test('shows type, id and title with proper spacing', () => {
    const out = renderList([doc({})], 42)
    expect(out).toContain('rule     rule-x — Title')
  })

  test('maintains at least one space separator for all document types', () => {
    const out = renderList(
      [
        doc({ type: 'decision', id: 'dec-x' }),
        doc({ type: 'feature', id: 'feat-x' }),
      ],
      42,
    )
    // decision is 8 chars, so padEnd(9) gives one space separator
    expect(/decision /.test(out)).toBe(true)
    // feature is 7 chars, so padEnd(9) gives two space separators
    expect(/feature  /.test(out)).toBe(true)
  })

  test('an empty memory prints guidance, not silence', () => {
    const out = renderList([], 0)
    expect(out).toContain('0 documents')
    expect(out).toContain('pm add')
  })
})

describe('renderShow', () => {
  test('prints each document with a heading and its body', () => {
    const out = renderShow([doc({ id: 'rule-a', title: 'A', body: 'Body A.' })])
    expect(out).toContain('# rule-a — A')
    expect(out).toContain('Body A.')
  })

  test('separates multiple documents', () => {
    const out = renderShow([doc({ id: 'rule-a' }), doc({ id: 'rule-b' })])
    expect(out).toContain('rule-a')
    expect(out).toContain('rule-b')
    expect(out).toContain('---')
  })

  test('marks a superseded document with its replacement', () => {
    const out = renderShow([doc({ status: 'superseded', supersededBy: 'rule-new' })])
    expect(out).toContain('SUPERSEDED by rule-new')
  })
})
