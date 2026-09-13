import { mkdtempSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { DocType, Frontmatter } from '../../src/domain/types'
import { serializeDoc } from '../../src/domain/frontmatter'
import { atomicWrite } from '../../src/store/fs'
import { docRelPath, memoryRoot } from '../../src/store/paths'

export interface DocSpec {
  id: string
  type: DocType
  title?: string
  tags?: string[]
  source?: string | null
  status?: Frontmatter['status']
  superseded_by?: string | null
  links?: string[]
  refs?: string[]
  created?: string
  body?: string
}

export interface Repo {
  root: string
  memRoot: string
  cleanup(): void
}

export function makeRepo(docs: DocSpec[] = []): Repo {
  const root = mkdtempSync(join(tmpdir(), 'pm-repo-'))
  mkdirSync(join(root, '.git'))
  const memRoot = memoryRoot(root)
  mkdirSync(memRoot, { recursive: true })

  for (const d of docs) {
    const fm: Frontmatter = {
      id: d.id,
      type: d.type,
      title: d.title ?? d.id,
      tags: d.tags ?? [],
      source: d.source === undefined ? (d.type === 'rule' || d.type === 'decision' ? 'test fixture' : null) : d.source,
      status: d.status ?? 'active',
      superseded_by: d.superseded_by ?? null,
      links: d.links ?? [],
      refs: d.refs ?? [],
      created: d.created ?? '2026-01-01',
    }
    atomicWrite(join(memRoot, docRelPath(d.type, d.id)), serializeDoc(fm, d.body ?? `Body of ${d.id}.`))
  }

  return { root, memRoot, cleanup: () => rmSync(root, { recursive: true, force: true }) }
}
