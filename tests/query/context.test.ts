import { describe, expect, test, afterEach } from 'bun:test'
import { buildContext } from '../../src/query/context'
import { loadIndex } from '../../src/index/persist'
import { renderContext } from '../../src/render/context'
import { estimateTokens } from '../../src/domain/tokens'
import { makeRepo, type Repo } from '../helpers/makeRepo'

let repo: Repo | null = null
afterEach(() => {
  repo?.cleanup()
  repo = null
})

describe('buildContext', () => {
  test('rules and decisions come back full, flows and features as lines', () => {
    repo = makeRepo([
      { id: 'rule-a', type: 'rule', title: 'Cancellation restriction' },
      { id: 'dec-a', type: 'decision', title: 'Cancellation validation' },
      { id: 'flow-a', type: 'flow', title: 'Cancellation flow' },
      { id: 'feature-a', type: 'feature', title: 'Cancellation feature' },
    ])
    const r = buildContext(loadIndex(repo.memRoot), 'cancellation')
    const mode = (id: string) => r.entries.find((e) => e.doc.id === id)?.mode
    expect(mode('rule-a')).toBe('full')
    expect(mode('dec-a')).toBe('full')
    expect(mode('flow-a')).toBe('line')
    expect(mode('feature-a')).toBe('line')
  })

  test('pulls in a linked decision the query did not match directly', () => {
    repo = makeRepo([
      { id: 'rule-a', type: 'rule', title: 'Cancellation restriction', links: ['dec-b'] },
      { id: 'dec-b', type: 'decision', title: 'Layering choice' },
    ])
    const r = buildContext(loadIndex(repo.memRoot), 'cancellation')
    const related = r.entries.find((e) => e.doc.id === 'dec-b')
    expect(related?.origin).toBe('related')
  })

  test('noExpand suppresses the graph', () => {
    repo = makeRepo([
      { id: 'rule-a', type: 'rule', title: 'Cancellation restriction', links: ['dec-b'] },
      { id: 'dec-b', type: 'decision', title: 'Layering choice' },
    ])
    const r = buildContext(loadIndex(repo.memRoot), 'cancellation', { noExpand: true })
    expect(r.entries.map((e) => e.doc.id)).toEqual(['rule-a'])
  })

  test('caps seeds at five even when more documents match', () => {
    repo = makeRepo(
      Array.from({ length: 9 }, (_, i) => ({ id: `rule-${i}`, type: 'rule' as const, title: 'Cancellation rule' })),
    )
    const r = buildContext(loadIndex(repo.memRoot), 'cancellation')
    expect(r.entries.filter((e) => e.origin === 'seed').length).toBeLessThanOrEqual(5)
  })

  test('drops weak matches below the seed ratio', () => {
    repo = makeRepo([
      { id: 'rule-strong', type: 'rule', title: 'Cancellation of policy' },
      { id: 'rule-weak', type: 'rule', title: 'Unrelated', body: `filler ${'word '.repeat(400)} cancellation` },
    ])
    const r = buildContext(loadIndex(repo.memRoot), 'cancellation of policy')
    expect(r.entries.map((e) => e.doc.id)).not.toContain('rule-weak')
  })

  test('stays inside the token budget and reports truncation', () => {
    repo = makeRepo(
      Array.from({ length: 8 }, (_, i) => ({
        id: `rule-${i}`,
        type: 'rule' as const,
        title: 'Cancellation rule',
        body: 'x'.repeat(2000),
      })),
    )
    // 20 tokens used to be enough to force truncation under the old cost
    // model, but that model only priced entry bodies. Now that the fixed
    // heading/footer overhead is budgeted too (Fix 1), anything under that
    // frame's own floor can never show a single entry — 60 is comfortably
    // above the floor while still being far too small for all 8 docs.
    const r = buildContext(loadIndex(repo.memRoot), 'cancellation', { maxTokens: 60 })
    expect(r.estimatedTokens).toBeLessThanOrEqual(60)
    expect(r.shown).toBeLessThan(r.matched)
    expect(r.truncated).toBe(r.matched - r.shown)
  })

  test('demotes a rule to a line rather than dropping it, when it nearly fits', () => {
    repo = makeRepo([
      { id: 'rule-a', type: 'rule', title: 'Cancellation short', body: 'short' },
      { id: 'rule-b', type: 'rule', title: 'Cancellation long', body: 'y'.repeat(1200) },
    ])
    const r = buildContext(loadIndex(repo.memRoot), 'cancellation', { maxTokens: 120 })
    expect(r.entries.find((e) => e.doc.id === 'rule-b')?.mode).toBe('line')
  })

  test('a seed is never displaced by a related document', () => {
    repo = makeRepo([
      { id: 'rule-seed', type: 'rule', title: 'Cancellation restriction', links: ['dec-linked'] },
      { id: 'dec-linked', type: 'decision', title: 'Linked decision', body: 'z'.repeat(4000) },
    ])
    const r = buildContext(loadIndex(repo.memRoot), 'cancellation', { maxTokens: 100 })
    expect(r.entries[0]?.doc.id).toBe('rule-seed')
  })

  test('excludes superseded documents unless asked', () => {
    repo = makeRepo([
      { id: 'rule-old', type: 'rule', title: 'Cancellation', status: 'superseded', superseded_by: 'rule-new' },
      { id: 'rule-new', type: 'rule', title: 'Cancellation revised' },
    ])
    const idx = loadIndex(repo.memRoot)
    expect(buildContext(idx, 'cancellation').entries.map((e) => e.doc.id)).toEqual(['rule-new'])
    expect(buildContext(idx, 'cancellation', { includeSuperseded: true }).entries.length).toBe(2)
  })

  test('an unmatched query returns a well-formed empty result', () => {
    repo = makeRepo([{ id: 'rule-a', type: 'rule', title: 'Cancellation' }])
    const r = buildContext(loadIndex(repo.memRoot), 'quantum tunnelling')
    expect(r.entries).toEqual([])
    expect(r.matched).toBe(0)
    expect(r.truncated).toBe(0)
    expect(r.totalDocs).toBe(1)
  })

  test('estimatedTokens tracks the real cost of the rendered output', () => {
    // Fix 1: the footer used to price only entry bodies and ignore the
    // heading, section headers, the Related header and the footer itself —
    // a ~37% undercount in the reported reviewer case. Rendering the actual
    // result and re-measuring it is the only check that catches that drift.
    repo = makeRepo([
      { id: 'rule-a', type: 'rule', title: 'Cancellation restriction', links: ['dec-b'] },
      { id: 'dec-b', type: 'decision', title: 'Layering choice' },
      { id: 'flow-a', type: 'flow', title: 'Cancellation flow' },
      { id: 'feature-a', type: 'feature', title: 'Cancellation feature' },
    ])
    const r = buildContext(loadIndex(repo.memRoot), 'cancellation')
    const rendered = renderContext(r, new Date('2026-09-12T00:00:00Z'))
    const actual = estimateTokens(rendered)
    expect(Math.abs(r.estimatedTokens - actual)).toBeLessThanOrEqual(5)
  })

  test('a budget too small to show anything is distinct from nothing matching', () => {
    repo = makeRepo(
      Array.from({ length: 8 }, (_, i) => ({
        id: `rule-${i}`,
        type: 'rule' as const,
        title: 'Cancellation rule',
        body: 'x'.repeat(2000),
      })),
    )
    const r = buildContext(loadIndex(repo.memRoot), 'cancellation', { maxTokens: 30 })
    expect(r.matched).toBeGreaterThan(0)
    expect(r.shown).toBe(0)
    const out = renderContext(r, new Date('2026-09-12T00:00:00Z'))
    expect(out).not.toContain('No business context found')
    expect(out).toContain('but none fit in the token budget')
    expect(out).toContain(`${r.matched} matched · 0 shown`)
  })
})
