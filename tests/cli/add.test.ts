import { describe, expect, test, afterEach } from 'bun:test'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
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

describe('pm add', () => {
  test('--stub writes frontmatter and prints the path', () => {
    repo = makeRepo([])
    const i = io(repo.root, ['add', 'rule', '--title', 'Open claims restriction', '--source', 'ops meeting', '--stub'])
    expect(run(i)).toBe(EXIT.OK)
    const rel = 'rules/rule-open-claims-restriction.md'
    expect(existsSync(join(repo.memRoot, rel))).toBe(true)
    expect(i.outText().trim()).toContain(rel)
    const text = readFileSync(join(repo.memRoot, rel), 'utf8')
    expect(text).toContain('id: rule-open-claims-restriction')
    expect(text).toContain('created: 2026-09-12')
  })

  test('rejects a rule without --source', () => {
    repo = makeRepo([])
    const i = io(repo.root, ['add', 'rule', '--title', 'No source', '--stub'])
    expect(run(i)).toBe(EXIT.INVALID)
    expect(i.errText()).toContain('source')
  })

  test('does not require --source for a flow', () => {
    repo = makeRepo([])
    expect(run(io(repo.root, ['add', 'flow', '--title', 'Renewal flow', '--stub']))).toBe(EXIT.OK)
  })

  test('reads the body from stdin', () => {
    repo = makeRepo([])
    run(io(repo.root, ['add', 'rule', '--title', 'From stdin', '--source', 's', '-'], 'Line one.\nLine two.\n'))
    const text = readFileSync(join(repo.memRoot, 'rules/rule-from-stdin.md'), 'utf8')
    expect(text).toContain('Line one.\nLine two.')
  })

  test('reads the body from --body-file', () => {
    repo = makeRepo([])
    const f = join(repo.root, 'body.md')
    writeFileSync(f, 'From a file.\n', 'utf8')
    run(io(repo.root, ['add', 'rule', '--title', 'From file', '--source', 's', '--body-file', f]))
    expect(readFileSync(join(repo.memRoot, 'rules/rule-from-file.md'), 'utf8')).toContain('From a file.')
  })

  test('parses --tags, --refs and --links as comma-separated lists', () => {
    repo = makeRepo([])
    run(io(repo.root, ['add', 'rule', '--title', 'With meta', '--source', 's', '--tags', 'policies,cancellation', '--refs', 'PolicyService', '--links', 'dec-a', '--stub']))
    const text = readFileSync(join(repo.memRoot, 'rules/rule-with-meta.md'), 'utf8')
    expect(text).toContain('  - policies')
    expect(text).toContain('  - PolicyService')
  })

  test('refuses a near-duplicate with exit 6 and candidates', () => {
    repo = makeRepo([{ id: 'rule-payment-method-persistence', type: 'rule', title: 'Payment method persistence' }])
    const i = io(repo.root, ['add', 'rule', '--title', 'Payment method persistence', '--source', 's', '--stub', '--json'])
    expect(run(i)).toBe(EXIT.CONFLICT)
    const parsed = JSON.parse(i.outText())
    expect(parsed.error.code).toBe('SIMILAR_DOCS')
    expect(parsed.error.similar[0].id).toBe('rule-payment-method-persistence')
    expect(parsed.error.hint).toContain('--force')
  })

  test('the duplicate check is scoped to the same type', () => {
    repo = makeRepo([{ id: 'dec-payment-method-persistence', type: 'decision', title: 'Payment method persistence' }])
    expect(run(io(repo.root, ['add', 'rule', '--title', 'Payment method persistence', '--source', 's', '--stub']))).toBe(EXIT.OK)
  })

  test('--force writes despite a near-duplicate, with a distinct id', () => {
    repo = makeRepo([{ id: 'rule-payment-method-persistence', type: 'rule', title: 'Payment method persistence' }])
    expect(run(io(repo.root, ['add', 'rule', '--title', 'Payment method persistence', '--source', 's', '--stub', '--force']))).toBe(EXIT.OK)
    expect(existsSync(join(repo.memRoot, 'rules/rule-payment-method-persistence-2.md'))).toBe(true)
  })

  test('never prompts, even when the io says it is interactive', () => {
    repo = makeRepo([{ id: 'rule-a-title', type: 'rule', title: 'A title' }])
    const i = io(repo.root, ['add', 'rule', '--title', 'A title', '--source', 's', '--stub'])
    const code = run({ ...i, interactive: true })
    expect(code).toBe(EXIT.CONFLICT)
  })

  test('an unknown type exits 2 and lists the valid ones', () => {
    repo = makeRepo([])
    const i = io(repo.root, ['add', 'policy', '--title', 'X', '--stub'])
    expect(run(i)).toBe(EXIT.USAGE)
    expect(i.errText()).toContain('rule')
  })

  test('a title that reduces to an empty slug exits 2', () => {
    repo = makeRepo([])
    expect(run(io(repo.root, ['add', 'rule', '--title', '!!!', '--source', 's', '--stub']))).toBe(EXIT.USAGE)
  })
})
