import { describe, expect, test, afterEach } from 'bun:test'
import { validateIndex } from '../../src/domain/validate'
import { loadIndex } from '../../src/index/persist'
import { makeRepo, type Repo } from '../helpers/makeRepo'

const NOW = new Date('2026-09-12T00:00:00Z')
let repo: Repo | null = null
afterEach(() => {
  repo?.cleanup()
  repo = null
})

function errors(findings: ReturnType<typeof validateIndex>): string[] {
  return findings.filter((f) => f.level === 'error').map((f) => f.message)
}

describe('validateIndex', () => {
  test('a healthy memory produces no errors', () => {
    repo = makeRepo([
      { id: 'rule-a', type: 'rule', title: 'Rule A', links: ['dec-b'], created: '2026-09-01' },
      { id: 'dec-b', type: 'decision', title: 'Decision B', links: ['rule-a'], created: '2026-09-01' },
    ])
    expect(errors(validateIndex(loadIndex(repo.memRoot), [], NOW))).toEqual([])
  })

  test('reports a broken link', () => {
    repo = makeRepo([{ id: 'rule-a', type: 'rule', links: ['ghost-x'] }])
    expect(errors(validateIndex(loadIndex(repo.memRoot), [], NOW)).join(' ')).toContain('ghost-x')
  })

  test('reports a broken wiki link in the body', () => {
    repo = makeRepo([{ id: 'rule-a', type: 'rule', body: 'See [[ghost-y]].' }])
    expect(errors(validateIndex(loadIndex(repo.memRoot), [], NOW)).join(' ')).toContain('ghost-y')
  })

  test('reports superseded_by pointing at a missing document', () => {
    repo = makeRepo([{ id: 'rule-a', type: 'rule', status: 'superseded', superseded_by: 'ghost-z' }])
    expect(errors(validateIndex(loadIndex(repo.memRoot), [], NOW)).join(' ')).toContain('ghost-z')
  })

  test('reports a supersession cycle', () => {
    repo = makeRepo([
      { id: 'rule-a', type: 'rule', status: 'superseded', superseded_by: 'rule-b' },
      { id: 'rule-b', type: 'rule', status: 'superseded', superseded_by: 'rule-a' },
    ])
    expect(errors(validateIndex(loadIndex(repo.memRoot), [], NOW)).join(' ')).toContain('cycle')
  })

  test('reports an id that does not match its filename', () => {
    repo = makeRepo([{ id: 'rule-a', type: 'rule' }])
    const idx = loadIndex(repo.memRoot)
    idx.file.docs['rule-a']!.path = 'rules/rule-somethingelse.md'
    expect(errors(validateIndex(idx, [], NOW)).join(' ')).toContain('filename')
  })

  test('forwards indexer warnings as errors', () => {
    repo = makeRepo([{ id: 'rule-a', type: 'rule' }])
    const found = validateIndex(loadIndex(repo.memRoot), ['rules/broken.md: no frontmatter block'], NOW)
    expect(errors(found).join(' ')).toContain('broken.md')
  })

  test('warns about an old document without failing', () => {
    repo = makeRepo([{ id: 'rule-a', type: 'rule', created: '2024-01-01', links: ['rule-a'] }])
    const found = validateIndex(loadIndex(repo.memRoot), [], NOW)
    expect(found.some((f) => f.level === 'warning' && f.message.includes('months old'))).toBe(true)
    expect(errors(found)).toEqual([])
  })

  test('warns about an orphan document', () => {
    repo = makeRepo([{ id: 'rule-a', type: 'rule', created: '2026-09-01' }])
    const found = validateIndex(loadIndex(repo.memRoot), [], NOW)
    expect(found.some((f) => f.level === 'warning' && f.message.includes('no links'))).toBe(true)
  })

  test('warns about a Spanish-looking title', () => {
    repo = makeRepo([{ id: 'rule-a', type: 'rule', title: 'Regla de Negocio', created: '2026-09-01' }])
    const found = validateIndex(loadIndex(repo.memRoot), [], NOW)
    const spanishWarning = found.find((f) => f.level === 'warning' && f.message.includes('Spanish'))
    expect(spanishWarning).toBeDefined()
    expect(spanishWarning?.message).toContain('title looks Spanish')
    expect(errors(found)).toEqual([])
  })

  test('warns about a Spanish-looking tag', () => {
    repo = makeRepo([
      { id: 'rule-a', type: 'rule', title: 'Good Title', tags: ['proceso', 'de', 'negocio'], created: '2026-09-01' },
    ])
    const found = validateIndex(loadIndex(repo.memRoot), [], NOW)
    const spanishWarning = found.find((f) => f.level === 'warning' && f.message.includes('Spanish'))
    expect(spanishWarning).toBeDefined()
    expect(spanishWarning?.message).toContain("tag 'de' looks Spanish")
    expect(errors(found)).toEqual([])
  })

  test('produces no Spanish warning for all-English text', () => {
    repo = makeRepo([
      { id: 'rule-a', type: 'rule', title: 'Business Rule', tags: ['process', 'workflow'], created: '2026-09-01' },
    ])
    const found = validateIndex(loadIndex(repo.memRoot), [], NOW)
    const spanishWarning = found.find((f) => f.level === 'warning' && f.message.includes('Spanish'))
    expect(spanishWarning).toBeUndefined()
    expect(errors(found)).toEqual([])
  })
})
