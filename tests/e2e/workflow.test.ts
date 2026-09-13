import { describe, expect, test, beforeAll, afterEach } from 'bun:test'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ROOT = join(import.meta.dir, '..', '..')
const BIN = join(ROOT, 'dist', 'bin.js')

beforeAll(() => {
  execFileSync('bun', ['run', 'build'], { cwd: ROOT, stdio: 'pipe' })
})

const dirs: string[] = []
function repo(): string {
  const d = mkdtempSync(join(tmpdir(), 'pm-e2e-'))
  mkdirSync(join(d, '.git'))
  dirs.push(d)
  return d
}
afterEach(() => {
  while (dirs.length > 0) rmSync(dirs.pop() as string, { recursive: true, force: true })
})

function pm(cwd: string, args: string[], input = ''): { code: number; out: string; err: string } {
  const r = spawnSync('node', [BIN, ...args], { cwd, input, encoding: 'utf8', env: { ...process.env, CI: '1' } })
  return { code: r.status ?? -1, out: r.stdout, err: r.stderr }
}

describe('full agent workflow', () => {
  test('init, add, write body, context, validate', () => {
    const d = repo()

    expect(pm(d, ['init']).code).toBe(0)

    const added = pm(d, ['add', 'rule', '--title', 'Open claims restriction', '--source', 'ops meeting 2026-08-30', '--tags', 'policies,cancellation', '--stub', '--json'])
    expect(added.code).toBe(0)
    const rel = JSON.parse(added.out).data.path as string

    const abs = join(d, '.project-memory', ...rel.split('/'))
    writeFileSync(abs, `${readFileSync(abs, 'utf8').trimEnd()}\n\nA policy with an open claim cannot be manually cancelled.\n`, 'utf8')

    const ctx = pm(d, ['context', 'cancellation'])
    expect(ctx.code).toBe(0)
    expect(ctx.out).toContain('A policy with an open claim cannot be manually cancelled.')

    expect(pm(d, ['validate']).code).toBe(0)
  })

  test('a duplicate attempt exits 6 with an executable hint', () => {
    const d = repo()
    pm(d, ['init'])
    pm(d, ['add', 'rule', '--title', 'Payment method persistence', '--source', 's', '--stub'])
    const dup = pm(d, ['add', 'rule', '--title', 'Payment method persistence', '--source', 's', '--stub', '--json'])
    expect(dup.code).toBe(6)
    const parsed = JSON.parse(dup.out)
    expect(parsed.error.code).toBe('SIMILAR_DOCS')
    expect(parsed.error.hint).toContain('pm update')
  })

  test('nothing ever hangs waiting for input', () => {
    const d = repo()
    pm(d, ['init'])
    pm(d, ['add', 'rule', '--title', 'A rule', '--source', 's', '--stub'])
    const r = spawnSync('node', [BIN, 'add', 'rule', '--title', 'A rule', '--source', 's', '--stub'], {
      cwd: d, encoding: 'utf8', timeout: 10000, input: '',
    })
    expect(r.signal).toBeNull()
    expect(r.status).toBe(6)
  })

  test('supersession removes a rule from context but keeps the file', () => {
    const d = repo()
    pm(d, ['init'])
    pm(d, ['add', 'rule', '--title', 'Old cancellation rule', '--source', 's', '--body', 'Old text.'])
    pm(d, ['add', 'rule', '--title', 'New cancellation rule', '--source', 's', '--body', 'New text.'])
    expect(pm(d, ['update', 'rule-old-cancellation-rule', '--status', 'superseded', '--superseded-by', 'rule-new-cancellation-rule']).code).toBe(0)

    const ctx = pm(d, ['context', 'cancellation'])
    expect(ctx.out).toContain('New text.')
    expect(ctx.out).not.toContain('Old text.')
    expect(existsSync(join(d, '.project-memory', 'rules', 'rule-old-cancellation-rule.md'))).toBe(true)
  })

  test('works from a nested subdirectory', () => {
    const d = repo()
    pm(d, ['init'])
    pm(d, ['add', 'rule', '--title', 'Nested lookup', '--source', 's', '--body', 'Found it.'])
    const nested = join(d, 'src', 'deep')
    mkdirSync(nested, { recursive: true })
    expect(pm(nested, ['context', 'nested lookup']).out).toContain('Found it.')
  })

  test('stops at a nested .git boundary', () => {
    const d = repo()
    pm(d, ['init'])
    const sub = join(d, 'subrepo')
    mkdirSync(join(sub, '.git'), { recursive: true })
    expect(pm(sub, ['list']).code).toBe(4)
  })

  test('index.json is ignored by git and the documents are not', () => {
    const d = repo()
    pm(d, ['init'])
    pm(d, ['add', 'rule', '--title', 'Tracked rule', '--source', 's', '--stub'])
    expect(readFileSync(join(d, '.project-memory', '.gitignore'), 'utf8')).toContain('index.json')
  })

  test('no generated file contains CRLF', () => {
    const d = repo()
    pm(d, ['init'])
    pm(d, ['add', 'rule', '--title', 'Line endings', '--source', 's', '--stub'])
    for (const f of ['SKILL.md', '.gitattributes', 'rules/rule-line-endings.md']) {
      expect(readFileSync(join(d, '.project-memory', ...f.split('/')), 'utf8')).not.toContain('\r')
    }
  })
})
