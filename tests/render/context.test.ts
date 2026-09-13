import { describe, expect, test } from 'bun:test'
import { renderContext } from '../../src/render/context'
import type { ContextEntry, ContextResult, IndexedDoc } from '../../src/domain/types'

const NOW = new Date('2026-09-12T00:00:00Z')

function doc(over: Partial<IndexedDoc>): IndexedDoc {
  return {
    id: 'rule-x', type: 'rule', title: 'Title', tags: [], refs: [], links: [],
    status: 'active', supersededBy: null, created: '2026-09-01',
    path: 'rules/rule-x.md', hash: 'sha256:0', body: 'Body.',
    ...over,
  }
}

function entry(d: IndexedDoc, mode: 'full' | 'line', score = 1): ContextEntry {
  return { doc: d, score, origin: 'seed', mode }
}

function result(entries: ContextEntry[], over: Partial<ContextResult> = {}): ContextResult {
  return {
    query: 'cancellation',
    totalDocs: 42,
    matched: entries.length,
    shown: entries.length,
    truncated: 0,
    estimatedTokens: 100,
    entries,
    ...over,
  }
}

describe('renderContext', () => {
  test('groups full entries by type with rules first', () => {
    const out = renderContext(
      result([
        entry(doc({ id: 'dec-a', type: 'decision', title: 'Domain validation' }), 'full'),
        entry(doc({ id: 'rule-a', title: 'Open claims restriction' }), 'full'),
      ]),
      NOW,
    )
    expect(out.indexOf('## Rules')).toBeLessThan(out.indexOf('## Decisions'))
    expect(out).toContain('### rule-a — Open claims restriction')
    expect(out).toContain('### dec-a — Domain validation')
  })

  test('renders full entries with their body', () => {
    const out = renderContext(result([entry(doc({ body: 'A policy cannot be cancelled.' }), 'full')]), NOW)
    expect(out).toContain('A policy cannot be cancelled.')
  })

  test('renders line entries under Related without their body', () => {
    const out = renderContext(
      result([entry(doc({ id: 'feature-431', type: 'feature', title: 'Feature 431', body: 'SECRET' }), 'line')]),
      NOW,
    )
    expect(out).toContain('## Related')
    expect(out).toContain('- feature-431 — Feature 431')
    expect(out).not.toContain('SECRET')
  })

  test('marks documents older than the threshold', () => {
    const out = renderContext(result([entry(doc({ created: '2025-01-01' }), 'full')]), NOW)
    expect(out).toContain('months old)')
  })

  test('ends with the cost footer', () => {
    const out = renderContext(
      result([entry(doc({}), 'full')], { totalDocs: 42, matched: 7, shown: 5, truncated: 2, estimatedTokens: 520 }),
      NOW,
    )
    expect(out.trimEnd().endsWith('42 docs · 7 matched · 5 shown · 2 truncated · ~520 tokens')).toBe(true)
  })

  test('says so plainly when nothing matched, instead of printing nothing', () => {
    const out = renderContext(result([], { matched: 0, shown: 0, truncated: 0, estimatedTokens: 12 }), NOW)
    expect(out).toContain('No business context found for "cancellation"')
    expect(out).not.toContain('token budget')
    expect(out.trim().length).toBeGreaterThan(0)
    // The footer must agree with the message: genuinely nothing matched.
    expect(out).toContain('0 matched · 0 shown · 0 truncated · ~12 tokens')
  })

  test('says the budget was too small, not that nothing matched, when documents matched but none fit', () => {
    const out = renderContext(result([], { matched: 5, shown: 0, truncated: 5, estimatedTokens: 41 }), NOW)
    expect(out).not.toContain('No business context found')
    expect(out).toContain('5 document(s) matched "cancellation", but none fit in the token budget.')
    expect(out).toContain('--max-tokens')
    expect(out).toContain('pm search "cancellation"')
    // The footer must agree with the message: 5 things matched, none shown.
    expect(out).toContain('5 matched · 0 shown · 5 truncated · ~41 tokens')
  })

  test('contains no non-ascii decoration', () => {
    const out = renderContext(result([entry(doc({}), 'full')]), NOW)
    const decorative = out.replace(/[·—]/g, '')
    expect(/[\u{1F300}-\u{1FAFF}─-╿]/u.test(decorative)).toBe(false)
  })
})
