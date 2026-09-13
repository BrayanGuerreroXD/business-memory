import type { DocType, IndexedDoc, MemoryIndex, ScoredDoc } from './types'
import { BODY_HIT_CAP, WEIGHTS } from './constants'
import { tokenize, tokenizeAll } from './text'

export interface ScoreOptions {
  includeSuperseded?: boolean
  type?: DocType
  excludeId?: string
}

function frequencies(s: string): Map<string, number> {
  const m = new Map<string, number>()
  for (const t of tokenizeAll(s)) m.set(t, (m.get(t) ?? 0) + 1)
  return m
}

export function maxPossibleScore(queryTokens: string[]): number {
  return queryTokens.length * WEIGHTS.title
}

export function scoreDoc(doc: IndexedDoc, queryTokens: string[]): number {
  if (queryTokens.length === 0) return 0

  const title = frequencies(doc.title)
  const tags = frequencies(doc.tags.join(' '))
  const refs = frequencies(doc.refs.join(' '))
  const body = frequencies(doc.body)

  let raw = 0
  let matched = 0

  for (const t of queryTokens) {
    let hit = false
    if (title.has(t)) {
      raw += WEIGHTS.title
      hit = true
    }
    if (tags.has(t)) {
      raw += WEIGHTS.tags
      hit = true
    }
    if (refs.has(t)) {
      raw += WEIGHTS.refs
      hit = true
    }
    const bodyHits = Math.min(body.get(t) ?? 0, BODY_HIT_CAP)
    if (bodyHits > 0) {
      raw += WEIGHTS.body * bodyHits
      hit = true
    }
    if (hit) matched++
  }

  if (matched === 0) return 0

  const coverage = matched / queryTokens.length
  const bodyWords = body.size === 0 ? 0 : tokenizeAll(doc.body).length
  const lengthNorm = 1 + Math.log10(1 + bodyWords / 200)

  return (raw * coverage) / lengthNorm
}

export function scoreDocs(index: MemoryIndex, query: string, opts: ScoreOptions = {}): ScoredDoc[] {
  const tokens = tokenize(query)
  const out: ScoredDoc[] = []

  for (const doc of Object.values(index.file.docs)) {
    if (opts.excludeId !== undefined && doc.id === opts.excludeId) continue
    if (opts.type !== undefined && doc.type !== opts.type) continue
    if (doc.status === 'superseded' && opts.includeSuperseded !== true) continue

    const score = scoreDoc(doc, tokens)
    if (score > 0) out.push({ doc, score, origin: 'seed' })
  }

  out.sort((a, b) => (b.score - a.score) || a.doc.id.localeCompare(b.doc.id))
  return out
}
