import { describe, expect, test, afterEach } from 'bun:test'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { run } from '../../src/cli/run'
import { EXIT } from '../../src/cli/exit'
import type { Io } from '../../src/cli/io'

const dirs: string[] = []
function tmpRepo(): string {
  const d = mkdtempSync(join(tmpdir(), 'pm-init-'))
  mkdirSync(join(d, '.git'))
  dirs.push(d)
  return d
}
afterEach(() => {
  while (dirs.length > 0) rmSync(dirs.pop() as string, { recursive: true, force: true })
})

function io(cwd: string, argv: string[]): Io & { outText: () => string } {
  const out: string[] = []
  return {
    cwd, env: {}, argv, now: new Date('2026-09-12T00:00:00Z'), interactive: false,
    stdout: (s) => out.push(s), stderr: () => {}, readStdin: () => '',
    outText: () => out.join(''),
  }
}

describe('pm init', () => {
  test('creates the full memory layout', () => {
    const repo = tmpRepo()
    expect(run(io(repo, ['init']))).toBe(EXIT.OK)
    const mem = join(repo, '.business-memory')
    for (const d of ['rules', 'flows', 'decisions', 'features']) {
      expect(existsSync(join(mem, d, '.gitkeep'))).toBe(true)
    }
    expect(existsSync(join(mem, 'SKILL.md'))).toBe(true)
    expect(readFileSync(join(mem, '.gitignore'), 'utf8')).toContain('index.json')
    expect(readFileSync(join(mem, '.gitattributes'), 'utf8')).toContain('eol=lf')
  })

  test('writes LF line endings even on Windows', () => {
    const repo = tmpRepo()
    run(io(repo, ['init']))
    expect(readFileSync(join(repo, '.business-memory', 'SKILL.md'), 'utf8')).not.toContain('\r')
  })

  test('is idempotent and reports what it respected', () => {
    const repo = tmpRepo()
    run(io(repo, ['init']))
    const sentinel = join(repo, '.business-memory', 'SKILL.md')
    writeFileSync(sentinel, 'CUSTOM PROTOCOL\n', 'utf8')
    const second = io(repo, ['init'])
    expect(run(second)).toBe(EXIT.OK)
    expect(readFileSync(sentinel, 'utf8')).toBe('CUSTOM PROTOCOL\n')
    expect(second.outText()).toContain('kept')
  })

  test('--force replaces SKILL.md', () => {
    const repo = tmpRepo()
    run(io(repo, ['init']))
    writeFileSync(join(repo, '.business-memory', 'SKILL.md'), 'CUSTOM\n', 'utf8')
    run(io(repo, ['init', '--force']))
    expect(readFileSync(join(repo, '.business-memory', 'SKILL.md'), 'utf8')).not.toBe('CUSTOM\n')
  })

  test('--json reports created and kept paths', () => {
    const repo = tmpRepo()
    const i = io(repo, ['init', '--json'])
    expect(run(i)).toBe(EXIT.OK)
    const parsed = JSON.parse(i.outText())
    expect(parsed.ok).toBe(true)
    expect(parsed.data.created).toContain('.business-memory/SKILL.md')
    expect(parsed.data.root).not.toContain('\\')
  })

  test('the initialised repository is immediately usable by list', () => {
    const repo = tmpRepo()
    run(io(repo, ['init']))
    const i = io(repo, ['list'])
    expect(run(i)).toBe(EXIT.OK)
    expect(i.outText()).toContain('0 documents')
  })
})
