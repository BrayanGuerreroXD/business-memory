import { describe, expect, test, afterEach } from 'bun:test'
import { join } from 'node:path'
import { writeFileSync } from 'node:fs'
import { hashContent } from '../../src/index/hash'
import { buildIndex } from '../../src/index/build'
import { buildBacklinks } from '../../src/index/backlinks'
import { makeRepo, type Repo } from '../helpers/makeRepo'

let repo: Repo | null = null
afterEach(() => {
  repo?.cleanup()
  repo = null
})

describe('hashContent', () => {
  test('is stable and prefixed', () => {
    expect(hashContent('abc')).toBe(hashContent('abc'))
    expect(hashContent('abc')).toStartWith('sha256:')
  })

  test('differs for different content', () => {
    expect(hashContent('a')).not.toBe(hashContent('b'))
  })
})

describe('buildIndex', () => {
  test('indexes every document with a relative posix path', () => {
    repo = makeRepo([
      { id: 'rule-a', type: 'rule', title: 'Rule A' },
      { id: 'dec-b', type: 'decision', title: 'Decision B' },
    ])
    const { file } = buildIndex(repo.memRoot, null)
    expect(Object.keys(file.docs).sort()).toEqual(['dec-b', 'rule-a'])
    expect(file.docs['rule-a']?.path).toBe('rules/rule-a.md')
    expect(file.docs['rule-a']?.path).not.toContain('\\')
  })

  test('merges frontmatter links with body wiki links', () => {
    repo = makeRepo([
      { id: 'rule-a', type: 'rule', links: ['dec-b'], body: 'See [[flow-c]] and [[dec-b]].' },
    ])
    const { file } = buildIndex(repo.memRoot, null)
    expect(file.docs['rule-a']?.links).toEqual(['dec-b', 'flow-c'])
  })

  test('reuses unchanged entries from the previous index', () => {
    repo = makeRepo([{ id: 'rule-a', type: 'rule' }])
    const first = buildIndex(repo.memRoot, null).file
    const second = buildIndex(repo.memRoot, first).file
    expect(second.docs['rule-a']).toBe(first.docs['rule-a'])
  })

  test('rebuilds an entry whose content changed', () => {
    repo = makeRepo([{ id: 'rule-a', type: 'rule', body: 'one' }])
    const first = buildIndex(repo.memRoot, null).file
    const r = repo
    writeFileSync(join(r.memRoot, 'rules', 'rule-a.md'), '---\nid: rule-a\ntype: rule\ntitle: Rule A\ntags: []\nsource: s\nstatus: active\nsuperseded_by: null\nlinks: []\nrefs: []\ncreated: 2026-01-01\n---\n\ntwo\n')
    const second = buildIndex(r.memRoot, first).file
    expect(second.docs['rule-a']?.body).toBe('two')
    expect(second.docs['rule-a']?.hash).not.toBe(first.docs['rule-a']?.hash)
  })

  test('drops documents removed from disk', () => {
    repo = makeRepo([{ id: 'rule-a', type: 'rule' }])
    const first = buildIndex(repo.memRoot, null).file
    const empty = makeRepo([])
    const second = buildIndex(empty.memRoot, first).file
    empty.cleanup()
    expect(Object.keys(second.docs)).toEqual([])
  })

  test('skips invalid documents and reports a warning instead of throwing', () => {
    repo = makeRepo([{ id: 'rule-a', type: 'rule' }])
    writeFileSync(join(repo.memRoot, 'rules', 'broken.md'), '# no frontmatter\n')
    const { file, warnings } = buildIndex(repo.memRoot, null)
    expect(Object.keys(file.docs)).toEqual(['rule-a'])
    expect(warnings.join(' ')).toContain('rules/broken.md')
  })

  test('indexes a document whose frontmatter ends the file with no trailing newline', () => {
    repo = makeRepo([{ id: 'rule-a', type: 'rule' }])
    const fm = [
      '---',
      'id: rule-b',
      'type: rule',
      'title: Rule B',
      'tags: []',
      'source: ops meeting',
      'status: active',
      'superseded_by: null',
      'links: []',
      'refs: []',
      'created: 2026-09-12',
      '---',
    ].join('\n')
    writeFileSync(join(repo.memRoot, 'rules', 'rule-b.md'), fm)

    const { file, warnings } = buildIndex(repo.memRoot, null)
    expect(Object.keys(file.docs).sort()).toEqual(['rule-a', 'rule-b'])
    expect(file.docs['rule-b']?.body).toBe('')
    expect(warnings).toEqual([])
  })

  test('ignores SKILL.md at the memory root', () => {
    repo = makeRepo([{ id: 'rule-a', type: 'rule' }])
    writeFileSync(join(repo.memRoot, 'SKILL.md'), '# protocol\n')
    const { file, warnings } = buildIndex(repo.memRoot, null)
    expect(Object.keys(file.docs)).toEqual(['rule-a'])
    expect(warnings).toEqual([])
  })

  test('reports a warning and keeps the first document when two files share an id', () => {
    repo = makeRepo([{ id: 'rule-a', type: 'rule', title: 'Rule A' }])
    writeFileSync(
      join(repo.memRoot, 'rules', 'rule-a-dup.md'),
      '---\nid: rule-a\ntype: rule\ntitle: Rule A Duplicate\ntags: []\nsource: s\nstatus: active\nsuperseded_by: null\nlinks: []\nrefs: []\ncreated: 2026-01-01\n---\n\ndup body\n',
    )
    const { file, warnings } = buildIndex(repo.memRoot, null)
    expect(Object.keys(file.docs)).toEqual(['rule-a'])
    // walkMarkdown returns sorted paths, so 'rules/rule-a-dup.md' sorts before 'rules/rule-a.md'
    // and is therefore the one kept; the later file in sort order triggers the warning.
    expect(file.docs['rule-a']?.path).toBe('rules/rule-a-dup.md')
    expect(warnings).toEqual([
      "rules/rule-a.md: duplicate id 'rule-a' (also in rules/rule-a-dup.md)",
    ])
  })

  test('detects a duplicate id when the existing entry is a cache hit and the new one is freshly parsed', () => {
    // 'rules/rule-a.md' sorts BEFORE 'rules/zzz-new.md', so the cache-hit
    // branch runs first and claims the id; the fresh-parse branch then
    // finds the id taken and must warn instead of overwriting.
    repo = makeRepo([{ id: 'rule-a', type: 'rule', title: 'Rule A' }])
    const previous = buildIndex(repo.memRoot, null).file
    writeFileSync(
      join(repo.memRoot, 'rules', 'zzz-new.md'),
      '---\nid: rule-a\ntype: rule\ntitle: Rule A New\ntags: []\nsource: s\nstatus: active\nsuperseded_by: null\nlinks: []\nrefs: []\ncreated: 2026-01-01\n---\n\nnew body\n',
    )
    const { file, warnings } = buildIndex(repo.memRoot, previous)
    expect(Object.keys(file.docs)).toEqual(['rule-a'])
    expect(file.docs['rule-a']?.path).toBe('rules/rule-a.md')
    expect(warnings).toEqual([
      "rules/zzz-new.md: duplicate id 'rule-a' (also in rules/rule-a.md)",
    ])
  })

  test('detects a duplicate id when the freshly parsed entry claims the id first and the cache hit follows', () => {
    // 'rules/aaa-new.md' sorts BEFORE 'rules/rule-a.md', so the fresh-parse
    // branch runs first and claims the id; the cache-hit branch then finds
    // the id taken and must warn instead of overwriting.
    repo = makeRepo([{ id: 'rule-a', type: 'rule', title: 'Rule A' }])
    const previous = buildIndex(repo.memRoot, null).file
    writeFileSync(
      join(repo.memRoot, 'rules', 'aaa-new.md'),
      '---\nid: rule-a\ntype: rule\ntitle: Rule A New\ntags: []\nsource: s\nstatus: active\nsuperseded_by: null\nlinks: []\nrefs: []\ncreated: 2026-01-01\n---\n\nnew body\n',
    )
    const { file, warnings } = buildIndex(repo.memRoot, previous)
    expect(Object.keys(file.docs)).toEqual(['rule-a'])
    expect(file.docs['rule-a']?.path).toBe('rules/aaa-new.md')
    expect(warnings).toEqual([
      "rules/rule-a.md: duplicate id 'rule-a' (also in rules/aaa-new.md)",
    ])
  })
})

describe('buildBacklinks', () => {
  test('inverts the link graph', () => {
    repo = makeRepo([
      { id: 'rule-a', type: 'rule', links: ['dec-b'] },
      { id: 'dec-b', type: 'decision' },
    ])
    const { file } = buildIndex(repo.memRoot, null)
    const back = buildBacklinks(file)
    expect([...(back.get('dec-b') ?? [])]).toEqual(['rule-a'])
    expect(back.get('rule-a')).toBeUndefined()
  })

  test('ignores links to documents that do not exist', () => {
    repo = makeRepo([{ id: 'rule-a', type: 'rule', links: ['missing-x'] }])
    const { file } = buildIndex(repo.memRoot, null)
    expect(buildBacklinks(file).get('missing-x')).toBeUndefined()
  })
})
