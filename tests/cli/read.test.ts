import { describe, expect, test, afterEach } from 'bun:test'
import { existsSync, rmSync } from 'node:fs'
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

const FIXTURE = [
  { id: 'rule-open-claims-restriction', type: 'rule' as const, title: 'Open claims restriction', tags: ['policies', 'cancellation'], links: ['dec-domain-validation'], body: 'A policy with an open claim cannot be manually cancelled.' },
  { id: 'dec-domain-validation', type: 'decision' as const, title: 'Domain validation', body: 'Validation belongs to the domain layer.' },
  { id: 'flow-policy-cancellation', type: 'flow' as const, title: 'Policy termination flow', links: ['rule-open-claims-restriction'], body: 'Long flow description.' },
  { id: 'rule-unrelated', type: 'rule' as const, title: 'Holiday schedule', body: 'Nothing to do with policies.' },
]

describe('pm show', () => {
  test('prints one document with its body', () => {
    repo = makeRepo(FIXTURE)
    const i = io(repo.root, ['show', 'rule-open-claims-restriction'])
    expect(run(i)).toBe(EXIT.OK)
    expect(i.outText()).toContain('A policy with an open claim')
  })

  test('accepts several ids in one call', () => {
    repo = makeRepo(FIXTURE)
    const i = io(repo.root, ['show', 'rule-open-claims-restriction', 'dec-domain-validation'])
    expect(run(i)).toBe(EXIT.OK)
    expect(i.outText()).toContain('rule-open-claims-restriction')
    expect(i.outText()).toContain('dec-domain-validation')
  })

  test('an unknown id exits 3 with a suggestion', () => {
    repo = makeRepo(FIXTURE)
    const i = io(repo.root, ['show', 'rule-open-claims'])
    expect(run(i)).toBe(EXIT.NOT_FOUND)
    expect(i.errText()).toContain('did you mean: rule-open-claims-restriction')
  })

  test('no id at all exits 2', () => {
    repo = makeRepo(FIXTURE)
    expect(run(io(repo.root, ['show']))).toBe(EXIT.USAGE)
  })
})

describe('pm path', () => {
  test('prints exactly one line ending in the document path', () => {
    repo = makeRepo(FIXTURE)
    const i = io(repo.root, ['path', 'rule-open-claims-restriction'])
    expect(run(i)).toBe(EXIT.OK)
    const lines = i.outText().trimEnd().split('\n')
    expect(lines.length).toBe(1)
    expect(existsSync(lines[0] as string)).toBe(true)
  })
})

describe('pm list', () => {
  test('lists every active document', () => {
    repo = makeRepo(FIXTURE)
    const i = io(repo.root, ['list'])
    expect(run(i)).toBe(EXIT.OK)
    expect(i.outText()).toContain('rule-open-claims-restriction')
    expect(i.outText()).toContain('dec-domain-validation')
  })

  test('filters by type and by tag', () => {
    repo = makeRepo(FIXTURE)
    const byType = io(repo.root, ['list', '--type', 'decision'])
    run(byType)
    expect(byType.outText()).toContain('dec-domain-validation')
    expect(byType.outText()).not.toContain('rule-open-claims-restriction')

    const byTag = io(repo.root, ['list', '--tag', 'cancellation'])
    run(byTag)
    expect(byTag.outText()).toContain('rule-open-claims-restriction')
    expect(byTag.outText()).not.toContain('rule-unrelated')
  })

  test('hides superseded documents unless --all', () => {
    repo = makeRepo([
      { id: 'rule-old', type: 'rule', status: 'superseded', superseded_by: 'rule-new' },
      { id: 'rule-new', type: 'rule' },
    ])
    const plain = io(repo.root, ['list'])
    run(plain)
    expect(plain.outText()).not.toContain('rule-old')
    const all = io(repo.root, ['list', '--all'])
    run(all)
    expect(all.outText()).toContain('rule-old')
  })

  test('an empty memory still prints guidance and exits 0', () => {
    repo = makeRepo([])
    const i = io(repo.root, ['list'])
    expect(run(i)).toBe(EXIT.OK)
    expect(i.outText().trim().length).toBeGreaterThan(0)
  })
})

describe('pm search', () => {
  test('ranks matching documents', () => {
    repo = makeRepo(FIXTURE)
    const i = io(repo.root, ['search', 'cancellation'])
    expect(run(i)).toBe(EXIT.OK)
    expect(i.outText()).toContain('rule-open-claims-restriction')
  })

  test('no results exits 0 and prints an actionable line', () => {
    repo = makeRepo(FIXTURE)
    const i = io(repo.root, ['search', 'quantum'])
    expect(run(i)).toBe(EXIT.OK)
    expect(i.outText()).toContain('0 results for "quantum"')
    expect(i.outText()).toContain('pm list')
  })

  test('joins multiple positionals into one query', () => {
    repo = makeRepo(FIXTURE)
    const i = io(repo.root, ['search', 'open', 'claims'])
    run(i)
    expect(i.outText()).toContain('rule-open-claims-restriction')
  })
})

describe('pm context', () => {
  test('returns rules and decisions in full and pulls in linked documents', () => {
    repo = makeRepo(FIXTURE)
    const i = io(repo.root, ['context', 'cancellation'])
    expect(run(i)).toBe(EXIT.OK)
    const out = i.outText()
    expect(out).toContain('# Business context: cancellation')
    expect(out).toContain('A policy with an open claim cannot be manually cancelled.')
    expect(out).toContain('dec-domain-validation')
    expect(out).toContain('## Related')
    expect(out).toContain('flow-policy-cancellation')
  })

  test('never returns the whole vault: unrelated documents stay out', () => {
    repo = makeRepo(FIXTURE)
    const i = io(repo.root, ['context', 'cancellation'])
    run(i)
    expect(i.outText()).not.toContain('Nothing to do with policies')
  })

  test('honours --max-tokens', () => {
    repo = makeRepo(FIXTURE)
    const full = io(repo.root, ['context', 'cancellation'])
    run(full)
    const limited = io(repo.root, ['context', 'cancellation', '--max-tokens', '40'])
    run(limited)

    const truncatedMatch = limited.outText().match(/(\d+) truncated/)
    expect(truncatedMatch).not.toBeNull()
    expect(Number(truncatedMatch?.[1])).toBeGreaterThan(0)
    expect(limited.outText().length).toBeLessThan(full.outText().length)
  })

  test('--no-expand drops the graph', () => {
    repo = makeRepo(FIXTURE)
    const i = io(repo.root, ['context', 'cancellation', '--no-expand'])
    run(i)
    expect(i.outText()).not.toContain('flow-policy-cancellation')
  })

  test('a query with no matches exits 0 and says so', () => {
    repo = makeRepo(FIXTURE)
    const i = io(repo.root, ['context', 'quantum'])
    expect(run(i)).toBe(EXIT.OK)
    expect(i.outText()).toContain('No business context found')
  })

  test('--json returns structured entries', () => {
    repo = makeRepo(FIXTURE)
    const i = io(repo.root, ['context', 'cancellation', '--json'])
    expect(run(i)).toBe(EXIT.OK)
    const parsed = JSON.parse(i.outText())
    expect(parsed.ok).toBe(true)
    expect(parsed.data.entries[0].id).toBe('rule-open-claims-restriction')
    expect(typeof parsed.data.estimatedTokens).toBe('number')
  })

  test('a bad --max-tokens exits 2', () => {
    repo = makeRepo(FIXTURE)
    expect(run(io(repo.root, ['context', 'x', '--max-tokens', 'abc']))).toBe(EXIT.USAGE)
  })
})

describe('pm index', () => {
  test('plain index performs the incremental refresh and reports that mode', () => {
    repo = makeRepo(FIXTURE)
    const cache = join(repo.memRoot, 'index.json')
    rmSync(cache, { force: true })
    const i = io(repo.root, ['index'])
    expect(run(i)).toBe(EXIT.OK)
    expect(existsSync(cache)).toBe(true)
    expect(i.outText()).toContain('incremental')
    expect(i.outText()).not.toContain('force')
  })

  test('plain index does not resurface warnings the way --force does', () => {
    repo = makeRepo(FIXTURE)
    const r = repo
    require('node:fs').writeFileSync(join(r.memRoot, 'rules', 'broken.md'), '# no frontmatter\n')
    const i = io(r.root, ['index'])
    expect(run(i)).toBe(EXIT.OK)
    expect(i.outText() + i.errText()).not.toContain('broken.md')
  })

  test('plain index reports its mode in --json too', () => {
    repo = makeRepo(FIXTURE)
    const i = io(repo.root, ['index', '--json'])
    expect(run(i)).toBe(EXIT.OK)
    const parsed = JSON.parse(i.outText())
    expect(parsed.ok).toBe(true)
    expect(parsed.data.mode).toBe('incremental')
  })

  test('--force rebuilds the cache after it is deleted and reports the force mode', () => {
    repo = makeRepo(FIXTURE)
    run(io(repo.root, ['list']))
    const cache = join(repo.memRoot, 'index.json')
    rmSync(cache, { force: true })
    const i = io(repo.root, ['index', '--force'])
    expect(run(i)).toBe(EXIT.OK)
    expect(existsSync(cache)).toBe(true)
    expect(i.outText()).toContain('force')
  })

  test('--force reports warnings for documents it had to skip', () => {
    repo = makeRepo(FIXTURE)
    const r = repo
    require('node:fs').writeFileSync(join(r.memRoot, 'rules', 'broken.md'), '# no frontmatter\n')
    const i = io(r.root, ['index', '--force'])
    expect(run(i)).toBe(EXIT.OK)
    expect(i.outText() + i.errText()).toContain('broken.md')
  })

  test('--force reports its mode in --json too', () => {
    repo = makeRepo(FIXTURE)
    const i = io(repo.root, ['index', '--force', '--json'])
    expect(run(i)).toBe(EXIT.OK)
    const parsed = JSON.parse(i.outText())
    expect(parsed.ok).toBe(true)
    expect(parsed.data.mode).toBe('force')
  })
})
