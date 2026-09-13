import { describe, expect, test, afterEach } from 'bun:test'
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { findRoot, toPosix, docRelPath, memoryRoot } from '../../src/store/paths'

const created: string[] = []
function tmp(): string {
  const d = mkdtempSync(join(tmpdir(), 'pm-paths-'))
  created.push(d)
  return d
}
afterEach(() => {
  while (created.length > 0) rmSync(created.pop() as string, { recursive: true, force: true })
})

describe('toPosix', () => {
  test('converts backslashes', () => {
    expect(toPosix('rules\\rule-x.md')).toBe('rules/rule-x.md')
  })
})

describe('docRelPath', () => {
  test('uses the type directory and the id as filename', () => {
    expect(docRelPath('rule', 'rule-open-claims-restriction')).toBe('rules/rule-open-claims-restriction.md')
    expect(docRelPath('decision', 'dec-domain-validation')).toBe('decisions/dec-domain-validation.md')
  })
})

describe('findRoot', () => {
  test('finds the memory directory in the current directory', () => {
    const root = tmp()
    mkdirSync(join(root, '.business-memory'))
    expect(findRoot(root, {})).toBe(root)
  })

  test('walks up from a nested directory', () => {
    const root = tmp()
    mkdirSync(join(root, '.business-memory'))
    const nested = join(root, 'src', 'deep')
    mkdirSync(nested, { recursive: true })
    expect(findRoot(nested, {})).toBe(root)
  })

  test('stops at the directory containing .git', () => {
    const outer = tmp()
    mkdirSync(join(outer, '.business-memory'))
    const inner = join(outer, 'subrepo')
    mkdirSync(join(inner, '.git'), { recursive: true })
    expect(findRoot(inner, {})).toBeNull()
  })

  test('the git boundary still allows a memory dir at the boundary itself', () => {
    const root = tmp()
    mkdirSync(join(root, '.git'))
    mkdirSync(join(root, '.business-memory'))
    expect(findRoot(root, {})).toBe(root)
  })

  test('PM_ROOT overrides the search', () => {
    const root = tmp()
    mkdirSync(join(root, '.business-memory'))
    const elsewhere = tmp()
    expect(findRoot(elsewhere, { PM_ROOT: root })).toBe(root)
  })

  test('PM_ROOT pointing at a directory without memory returns null', () => {
    const empty = tmp()
    expect(findRoot(empty, { PM_ROOT: empty })).toBeNull()
  })

  test('returns null when nothing is found', () => {
    expect(findRoot(tmp(), {})).toBeNull()
  })
})

describe('memoryRoot', () => {
  test('appends the memory directory', () => {
    expect(memoryRoot(join('a', 'b'))).toBe(join('a', 'b', '.business-memory'))
  })
})
