import { describe, expect, test, afterEach } from 'bun:test'
import { chmodSync, existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadIndex, saveIndex, indexPath } from '../../src/index/persist'
import { buildIndex } from '../../src/index/build'
import { makeRepo, type Repo } from '../helpers/makeRepo'

let repo: Repo | null = null
afterEach(() => {
  repo?.cleanup()
  repo = null
})

describe('loadIndex', () => {
  test('builds and persists the index on first call', () => {
    repo = makeRepo([{ id: 'rule-a', type: 'rule' }])
    const idx = loadIndex(repo.memRoot)
    expect(Object.keys(idx.file.docs)).toEqual(['rule-a'])
    expect(existsSync(indexPath(repo.memRoot))).toBe(true)
    expect(idx.storage).toBe('disk')
  })

  test('reuses the cache when nothing changed', () => {
    repo = makeRepo([{ id: 'rule-a', type: 'rule' }])
    loadIndex(repo.memRoot)
    const before = readFileSync(indexPath(repo.memRoot), 'utf8')
    loadIndex(repo.memRoot)
    expect(readFileSync(indexPath(repo.memRoot), 'utf8')).toBe(before)
  })

  test('picks up a new document without an explicit reindex', () => {
    repo = makeRepo([{ id: 'rule-a', type: 'rule' }])
    loadIndex(repo.memRoot)
    const more = makeRepo([{ id: 'rule-a', type: 'rule' }, { id: 'rule-b', type: 'rule' }])
    const idx = loadIndex(more.memRoot)
    more.cleanup()
    expect(Object.keys(idx.file.docs).sort()).toEqual(['rule-a', 'rule-b'])
  })

  test('rebuilds silently when the cache is corrupt', () => {
    repo = makeRepo([{ id: 'rule-a', type: 'rule' }])
    loadIndex(repo.memRoot)
    writeFileSync(indexPath(repo.memRoot), '{ not json', 'utf8')
    const idx = loadIndex(repo.memRoot)
    expect(Object.keys(idx.file.docs)).toEqual(['rule-a'])
  })

  test('rebuilds when the cache version is unknown', () => {
    repo = makeRepo([{ id: 'rule-a', type: 'rule' }])
    writeFileSync(indexPath(repo.memRoot), JSON.stringify({ version: 99, root: '.project-memory', docs: {} }), 'utf8')
    const idx = loadIndex(repo.memRoot)
    expect(Object.keys(idx.file.docs)).toEqual(['rule-a'])
  })

  test('carries backlinks', () => {
    repo = makeRepo([
      { id: 'rule-a', type: 'rule', links: ['dec-b'] },
      { id: 'dec-b', type: 'decision' },
    ])
    const idx = loadIndex(repo.memRoot)
    expect([...(idx.backlinks.get('dec-b') ?? [])]).toEqual(['rule-a'])
  })

  test('persists a renamed document path instead of keeping the stale one', () => {
    repo = makeRepo([{ id: 'rule-a', type: 'rule' }])
    loadIndex(repo.memRoot)
    const oldAbs = join(repo.memRoot, 'rules', 'rule-a.md')
    const newAbs = join(repo.memRoot, 'rules', 'rule-a-renamed.md')
    renameSync(oldAbs, newAbs)

    const idx = loadIndex(repo.memRoot)
    expect(idx.file.docs['rule-a']?.path).toBe('rules/rule-a-renamed.md')

    const persisted = JSON.parse(readFileSync(indexPath(repo.memRoot), 'utf8'))
    expect(persisted.docs['rule-a'].path).toBe('rules/rule-a-renamed.md')
  })

  test('serves a read-only memory directory without failing', () => {
    if (process.platform !== 'win32') {
      repo = makeRepo([{ id: 'rule-a', type: 'rule' }])
      chmodSync(repo.memRoot, 0o500)
      try {
        const idx = loadIndex(repo.memRoot)
        expect(Object.keys(idx.file.docs)).toEqual(['rule-a'])
        expect(idx.storage === 'tmp' || idx.storage === 'memory').toBe(true)
      } finally {
        chmodSync(repo.memRoot, 0o700)
      }
    } else {
      expect(true).toBe(true)
    }
  })
})

describe('saveIndex', () => {
  test('writes valid json that round-trips', () => {
    repo = makeRepo([{ id: 'rule-a', type: 'rule' }])
    const { file } = buildIndex(repo.memRoot, null)
    expect(saveIndex(repo.memRoot, file)).toBe('disk')
    const parsed = JSON.parse(readFileSync(indexPath(repo.memRoot), 'utf8'))
    expect(parsed.docs['rule-a'].id).toBe('rule-a')
  })

  test('contains no absolute paths', () => {
    repo = makeRepo([{ id: 'rule-a', type: 'rule' }])
    const { file } = buildIndex(repo.memRoot, null)
    saveIndex(repo.memRoot, file)
    const text = readFileSync(indexPath(repo.memRoot), 'utf8')
    expect(text).not.toContain(repo.root)
  })
})
