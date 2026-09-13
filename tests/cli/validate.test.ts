import { describe, expect, test, afterEach } from 'bun:test'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { run } from '../../src/cli/run'
import { EXIT } from '../../src/cli/exit'
import type { Io } from '../../src/cli/io'
import { makeRepo, type Repo } from '../helpers/makeRepo'

let repo: Repo | null = null
afterEach(() => {
  repo?.cleanup()
  repo = null
})

function io(cwd: string, argv: string[]): Io & { outText: () => string; errText: () => string } {
  const out: string[] = []
  const err: string[] = []
  return {
    cwd, env: {}, argv, now: new Date('2026-09-12T00:00:00Z'), interactive: false,
    stdout: (s) => out.push(s), stderr: (s) => err.push(s), readStdin: () => '',
    outText: () => out.join(''), errText: () => err.join(''),
  }
}

describe('pm validate', () => {
  test('a healthy memory exits 0 and says so', () => {
    repo = makeRepo([
      { id: 'rule-a', type: 'rule', title: 'Rule A', links: ['dec-b'], created: '2026-09-01' },
      { id: 'dec-b', type: 'decision', title: 'Decision B', created: '2026-09-01' },
    ])
    const i = io(repo.root, ['validate'])
    expect(run(i)).toBe(EXIT.OK)
    expect(i.outText()).toContain('0 errors')
  })

  test('exits 5 when a link is broken', () => {
    repo = makeRepo([{ id: 'rule-a', type: 'rule', links: ['ghost'] }])
    const i = io(repo.root, ['validate'])
    expect(run(i)).toBe(EXIT.INVALID)
    expect(i.outText() + i.errText()).toContain('ghost')
  })

  test('exits 5 when a rule has no source', () => {
    repo = makeRepo([])
    const r = repo
    mkdirSync(join(r.memRoot, 'rules'), { recursive: true })
    writeFileSync(
      join(r.memRoot, 'rules', 'rule-nosource.md'),
      '---\nid: rule-nosource\ntype: rule\ntitle: No source\ntags: []\nsource: null\nstatus: active\nsuperseded_by: null\nlinks: []\nrefs: []\ncreated: 2026-09-01\n---\n\nBody.\n',
    )
    expect(run(io(r.root, ['validate']))).toBe(EXIT.INVALID)
  })

  test('exits 5 on a duplicate id in two files', () => {
    repo = makeRepo([{ id: 'rule-a', type: 'rule' }])
    const r = repo
    writeFileSync(
      join(r.memRoot, 'legacy-rule-a.md'),
      '---\nid: rule-a\ntype: rule\ntitle: Rule A\ntags: []\nsource: s\nstatus: active\nsuperseded_by: null\nlinks: []\nrefs: []\ncreated: 2026-09-01\n---\n\nDuplicate.\n',
    )
    expect(run(io(r.root, ['validate']))).toBe(EXIT.INVALID)
  })

  test('warnings alone still exit 0', () => {
    repo = makeRepo([{ id: 'rule-a', type: 'rule', created: '2024-01-01' }])
    const i = io(repo.root, ['validate'])
    expect(run(i)).toBe(EXIT.OK)
    expect(i.outText()).toContain('warning')
  })

  test('--json reports findings in a structured envelope', () => {
    repo = makeRepo([{ id: 'rule-a', type: 'rule', links: ['ghost'] }])
    const i = io(repo.root, ['validate', '--json'])
    expect(run(i)).toBe(EXIT.INVALID)
    const parsed = JSON.parse(i.outText())
    expect(parsed.ok).toBe(false)
    expect(parsed.error.code).toBe('VALIDATION_FAILED')
    expect(parsed.error.findings.some((f: { message: string }) => f.message.includes('ghost'))).toBe(true)
  })

  test('Spanish-looking title warns and exits 0', () => {
    repo = makeRepo([{ id: 'rule-a', type: 'rule', title: 'Regla de Negocio', created: '2026-09-01' }])
    const i = io(repo.root, ['validate'])
    expect(run(i)).toBe(EXIT.OK)
    expect(i.outText()).toContain('warning')
    expect(i.outText()).toContain('Spanish')
  })

  test('Spanish-looking tag warns and exits 0', () => {
    repo = makeRepo([
      { id: 'rule-a', type: 'rule', title: 'Good Title', tags: ['proceso', 'de', 'negocio'], created: '2026-09-01' },
    ])
    const i = io(repo.root, ['validate'])
    expect(run(i)).toBe(EXIT.OK)
    expect(i.outText()).toContain('warning')
    expect(i.outText()).toContain('Spanish')
  })
})
