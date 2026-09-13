import { describe, expect, test, afterEach } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ensureDir, readText, atomicWrite, walkMarkdown } from '../../src/store/fs'

const created: string[] = []
function tmp(): string {
  const d = mkdtempSync(join(tmpdir(), 'pm-fs-'))
  created.push(d)
  return d
}
afterEach(() => {
  while (created.length > 0) rmSync(created.pop() as string, { recursive: true, force: true })
})

describe('ensureDir', () => {
  test('creates nested directories and is idempotent', () => {
    const root = tmp()
    const target = join(root, 'a', 'b', 'c')
    ensureDir(target)
    ensureDir(target)
    expect(readdirSync(join(root, 'a', 'b'))).toEqual(['c'])
  })
})

describe('readText', () => {
  test('normalizes CRLF to LF', () => {
    const root = tmp()
    const f = join(root, 'x.md')
    writeFileSync(f, 'a\r\nb\r\n', 'utf8')
    expect(readText(f)).toBe('a\nb\n')
  })

  test('reads UTF-8 content correctly', () => {
    const root = tmp()
    const f = join(root, 'x.md')
    writeFileSync(f, 'cancelación de póliza', 'utf8')
    expect(readText(f)).toBe('cancelación de póliza')
  })
})

describe('atomicWrite', () => {
  test('creates parent directories and writes the content', () => {
    const root = tmp()
    const f = join(root, 'rules', 'rule-x.md')
    atomicWrite(f, 'hello\n')
    expect(readFileSync(f, 'utf8')).toBe('hello\n')
  })

  test('overwrites an existing file', () => {
    const root = tmp()
    const f = join(root, 'x.md')
    atomicWrite(f, 'one\n')
    atomicWrite(f, 'two\n')
    expect(readFileSync(f, 'utf8')).toBe('two\n')
  })

  test('leaves no temporary files behind', () => {
    const root = tmp()
    atomicWrite(join(root, 'x.md'), 'content\n')
    expect(readdirSync(root)).toEqual(['x.md'])
  })

  test('never writes CRLF even when given CRLF', () => {
    const root = tmp()
    const f = join(root, 'x.md')
    atomicWrite(f, 'a\r\nb\n')
    expect(readFileSync(f, 'utf8')).toBe('a\nb\n')
  })
})

describe('walkMarkdown', () => {
  test('finds markdown at any depth and returns sorted posix paths', () => {
    const root = tmp()
    mkdirSync(join(root, 'rules'), { recursive: true })
    mkdirSync(join(root, 'legacy', 'old'), { recursive: true })
    writeFileSync(join(root, 'rules', 'rule-b.md'), 'x')
    writeFileSync(join(root, 'legacy', 'old', 'rule-a.md'), 'x')
    expect(walkMarkdown(root)).toEqual(['legacy/old/rule-a.md', 'rules/rule-b.md'])
  })

  test('ignores non-markdown files and dot directories', () => {
    const root = tmp()
    mkdirSync(join(root, '.cache'), { recursive: true })
    writeFileSync(join(root, '.cache', 'rule-x.md'), 'x')
    writeFileSync(join(root, 'index.json'), '{}')
    writeFileSync(join(root, 'SKILL.md'), 'x')
    expect(walkMarkdown(root)).toEqual(['SKILL.md'])
  })

  test('returns an empty array for a missing directory', () => {
    expect(walkMarkdown(join(tmp(), 'nope'))).toEqual([])
  })
})
