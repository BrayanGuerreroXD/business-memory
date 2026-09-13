import { describe, expect, test, afterEach } from 'bun:test'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { run } from '../../src/cli/run'
import { EXIT } from '../../src/cli/exit'
import type { Io } from '../../src/cli/io'
import { makeRepo, type Repo } from '../helpers/makeRepo'
import { BEGIN, END } from '../../src/skill/adapters'

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

describe('pm skill install', () => {
  test('--target claude writes the skill file', () => {
    repo = makeRepo([])
    writeFileSync(join(repo.memRoot, 'SKILL.md'), '# project-memory protocol\n\nRun pm context.\n')
    expect(run(io(repo.root, ['skill', 'install', '--target', 'claude']))).toBe(EXIT.OK)
    const p = join(repo.root, '.claude', 'skills', 'project-memory', 'SKILL.md')
    expect(existsSync(p)).toBe(true)
    expect(readFileSync(p, 'utf8')).toContain('name: project-memory')
  })

  test('--target agents creates AGENTS.md with a delimited block', () => {
    repo = makeRepo([])
    writeFileSync(join(repo.memRoot, 'SKILL.md'), '# protocol\n')
    run(io(repo.root, ['skill', 'install', '--target', 'agents']))
    expect(readFileSync(join(repo.root, 'AGENTS.md'), 'utf8')).toContain('BEGIN project-memory')
  })

  test('a second run preserves the user content in AGENTS.md', () => {
    repo = makeRepo([])
    writeFileSync(join(repo.memRoot, 'SKILL.md'), '# protocol\n')
    writeFileSync(join(repo.root, 'AGENTS.md'), '# House rules\n\nAlways run the linter.\n')
    run(io(repo.root, ['skill', 'install', '--target', 'agents']))
    run(io(repo.root, ['skill', 'install', '--target', 'agents']))
    const text = readFileSync(join(repo.root, 'AGENTS.md'), 'utf8')
    expect(text).toContain('Always run the linter.')
    expect(text.match(/BEGIN project-memory/g)?.length).toBe(1)
  })

  test('falls back to the built-in protocol when SKILL.md is absent', () => {
    repo = makeRepo([])
    expect(run(io(repo.root, ['skill', 'install', '--target', 'claude']))).toBe(EXIT.OK)
  })

  test('a missing --target exits 2 and lists the valid targets', () => {
    repo = makeRepo([])
    const i = io(repo.root, ['skill', 'install'])
    expect(run(i)).toBe(EXIT.USAGE)
    expect(i.errText()).toContain('claude')
    expect(i.errText()).toContain('agents')
  })

  test('an unknown subcommand exits 2', () => {
    repo = makeRepo([])
    expect(run(io(repo.root, ['skill', 'uninstall', '--target', 'claude']))).toBe(EXIT.USAGE)
  })

  test('--json reports the written path', () => {
    repo = makeRepo([])
    const i = io(repo.root, ['skill', 'install', '--target', 'claude', '--json'])
    expect(run(i)).toBe(EXIT.OK)
    expect(JSON.parse(i.outText()).data.written).toContain('.claude/skills/project-memory/SKILL.md')
  })

  test('refuses to touch AGENTS.md when a marker appears inside a documented example, leaving it byte-for-byte unchanged', () => {
    repo = makeRepo([])
    writeFileSync(join(repo.memRoot, 'SKILL.md'), '# protocol\n')
    const before = [
      '# House rules',
      '',
      'We document our AGENTS.md convention like this:',
      '',
      '```',
      BEGIN,
      '...',
      END,
      '```',
      '',
      BEGIN,
      'v1',
      END,
      '',
    ].join('\n')
    const abs = join(repo.root, 'AGENTS.md')
    writeFileSync(abs, before)

    const i = io(repo.root, ['skill', 'install', '--target', 'agents'])
    expect(run(i)).toBe(EXIT.CONFLICT)
    expect(readFileSync(abs, 'utf8')).toBe(before)
    expect(i.errText()).toContain('AGENTS.md')
  })

  test('refuses to touch AGENTS.md when END precedes BEGIN, leaving it byte-for-byte unchanged', () => {
    repo = makeRepo([])
    writeFileSync(join(repo.memRoot, 'SKILL.md'), '# protocol\n')
    const before = `${END}\nstray\n${BEGIN}\n`
    const abs = join(repo.root, 'AGENTS.md')
    writeFileSync(abs, before)

    const i = io(repo.root, ['skill', 'install', '--target', 'agents'])
    expect(run(i)).toBe(EXIT.CONFLICT)
    expect(readFileSync(abs, 'utf8')).toBe(before)
  })
})
