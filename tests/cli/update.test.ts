import { describe, expect, test, afterEach } from 'bun:test'
import { readFileSync } from 'node:fs'
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

function io(cwd: string, argv: string[], stdin = ''): Io & { outText: () => string; errText: () => string } {
  const out: string[] = []
  const err: string[] = []
  return {
    cwd, env: {}, argv, now: new Date('2026-09-12T00:00:00Z'), interactive: false,
    stdout: (s) => out.push(s), stderr: (s) => err.push(s), readStdin: () => stdin,
    outText: () => out.join(''), errText: () => err.join(''),
  }
}

describe('pm update', () => {
  test('replaces the body from stdin and keeps the id and created date', () => {
    repo = makeRepo([{ id: 'rule-a', type: 'rule', title: 'A', created: '2026-01-01', body: 'old' }])
    expect(run(io(repo.root, ['update', 'rule-a', '-'], 'new body\n'))).toBe(EXIT.OK)
    const text = readFileSync(join(repo.memRoot, 'rules/rule-a.md'), 'utf8')
    expect(text).toContain('new body')
    expect(text).toContain('id: rule-a')
    expect(text).toContain('created: 2026-01-01')
  })

  test('--stub leaves the body untouched and prints the path', () => {
    repo = makeRepo([{ id: 'rule-a', type: 'rule', body: 'keep me' }])
    const i = io(repo.root, ['update', 'rule-a', '--stub'])
    expect(run(i)).toBe(EXIT.OK)
    expect(readFileSync(join(repo.memRoot, 'rules/rule-a.md'), 'utf8')).toContain('keep me')
    expect(i.outText()).toContain('rule-a.md')
  })

  test('supersedes a document', () => {
    repo = makeRepo([
      { id: 'rule-old', type: 'rule' },
      { id: 'rule-new', type: 'rule' },
    ])
    expect(run(io(repo.root, ['update', 'rule-old', '--status', 'superseded', '--superseded-by', 'rule-new']))).toBe(EXIT.OK)
    const text = readFileSync(join(repo.memRoot, 'rules/rule-old.md'), 'utf8')
    expect(text).toContain('status: superseded')
    expect(text).toContain('superseded_by: rule-new')
  })

  test('superseding by an unknown id exits 3', () => {
    repo = makeRepo([{ id: 'rule-old', type: 'rule' }])
    expect(run(io(repo.root, ['update', 'rule-old', '--status', 'superseded', '--superseded-by', 'ghost']))).toBe(EXIT.NOT_FOUND)
  })

  test('superseded without --superseded-by exits 5', () => {
    repo = makeRepo([{ id: 'rule-old', type: 'rule' }])
    expect(run(io(repo.root, ['update', 'rule-old', '--status', 'superseded']))).toBe(EXIT.INVALID)
  })

  test('--add-tag, --add-link and --add-ref append without duplicating', () => {
    repo = makeRepo([{ id: 'rule-a', type: 'rule', tags: ['policies'] }])
    run(io(repo.root, ['update', 'rule-a', '--stub', '--add-tag', 'policies,cancellation', '--add-ref', 'PolicyService']))
    const text = readFileSync(join(repo.memRoot, 'rules/rule-a.md'), 'utf8')
    expect(text.match(/- policies/g)?.length).toBe(1)
    expect(text).toContain('- cancellation')
    expect(text).toContain('- PolicyService')
  })

  test('an unknown id exits 3 with a suggestion', () => {
    repo = makeRepo([{ id: 'rule-open-claims-restriction', type: 'rule' }])
    const i = io(repo.root, ['update', 'rule-open-claims', '--stub'])
    expect(run(i)).toBe(EXIT.NOT_FOUND)
    expect(i.errText()).toContain('did you mean: rule-open-claims-restriction')
  })
})
