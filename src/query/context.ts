import type { ContextEntry, ContextResult, MemoryIndex, ScoredDoc } from '../domain/types'
import { DEFAULT_MAX_TOKENS, MAX_SEEDS, SEED_RATIO } from '../domain/constants'
import { scoreDocs } from '../domain/scoring'
import { expand } from '../domain/graph'
import { estimateTokens } from '../domain/tokens'

export interface ContextOptions {
  maxTokens?: number
  limit?: number
  includeSuperseded?: boolean
  noExpand?: boolean
}

function fullCost(s: ScoredDoc): number {
  return estimateTokens(`### ${s.doc.id} — ${s.doc.title}\n${s.doc.body}\n\n`)
}

function lineCost(s: ScoredDoc): number {
  return estimateTokens(`- ${s.doc.id} — ${s.doc.title}\n`)
}

function prefersFull(s: ScoredDoc): boolean {
  return s.doc.type === 'rule' || s.doc.type === 'decision'
}

export function buildContext(
  index: MemoryIndex,
  query: string,
  opts: ContextOptions = {},
): ContextResult {
  const maxTokens = opts.maxTokens ?? DEFAULT_MAX_TOKENS
  const totalDocs = Object.keys(index.file.docs).length

  const scoreOpts = opts.includeSuperseded === undefined ? {} : { includeSuperseded: opts.includeSuperseded }
  const scored = scoreDocs(index, query, scoreOpts)

  if (scored.length === 0) {
    return { query, totalDocs, matched: 0, shown: 0, truncated: 0, estimatedTokens: 0, entries: [] }
  }

  const top = scored[0]!.score
  const seeds = scored.filter((s) => s.score >= SEED_RATIO * top).slice(0, MAX_SEEDS)
  const related = opts.noExpand === true ? [] : expand(index, seeds, scoreOpts)

  const candidates = [...seeds, ...related]
  const limited = opts.limit === undefined ? candidates : candidates.slice(0, opts.limit)

  const entries: ContextEntry[] = []
  let used = 0

  for (const candidate of limited) {
    if (prefersFull(candidate)) {
      const cost = fullCost(candidate)
      if (used + cost <= maxTokens) {
        entries.push({ ...candidate, mode: 'full' })
        used += cost
        continue
      }
    }
    const cost = lineCost(candidate)
    if (used + cost > maxTokens) break
    entries.push({ ...candidate, mode: 'line' })
    used += cost
  }

  return {
    query,
    totalDocs,
    matched: candidates.length,
    shown: entries.length,
    truncated: candidates.length - entries.length,
    estimatedTokens: used,
    entries,
  }
}
