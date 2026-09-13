import type { ContextEntry, ContextResult, MemoryIndex, ScoredDoc } from '../domain/types'
import { DEFAULT_MAX_TOKENS, MAX_SEEDS, SEED_RATIO } from '../domain/constants'
import { scoreDocs } from '../domain/scoring'
import { expand } from '../domain/graph'
import {
  contextFooterBlock,
  contextHeadingBlock,
  contextNoResultsBlock,
  contextRelatedHeaderBlock,
  contextSectionHeaderBlock,
  estimateTokens,
  type ContextFooterCounts,
} from '../domain/tokens'

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

function footerCost(counts: ContextFooterCounts): number {
  return estimateTokens(contextFooterBlock(counts))
}

export function buildContext(
  index: MemoryIndex,
  query: string,
  opts: ContextOptions = {},
): ContextResult {
  const maxTokens = opts.maxTokens ?? DEFAULT_MAX_TOKENS
  const totalDocs = Object.keys(index.file.docs).length
  const headingCost = estimateTokens(contextHeadingBlock(query))

  const scoreOpts = opts.includeSuperseded === undefined ? {} : { includeSuperseded: opts.includeSuperseded }
  const scored = scoreDocs(index, query, scoreOpts)

  if (scored.length === 0) {
    let used = headingCost + estimateTokens(contextNoResultsBlock(query))
    used += footerCost({ totalDocs, matched: 0, shown: 0, truncated: 0, estimatedTokens: used })
    return { query, totalDocs, matched: 0, shown: 0, truncated: 0, estimatedTokens: used, entries: [] }
  }

  const top = scored[0]!.score
  const seeds = scored.filter((s) => s.score >= SEED_RATIO * top).slice(0, MAX_SEEDS)
  const related = opts.noExpand === true ? [] : expand(index, seeds, scoreOpts)

  const candidates = [...seeds, ...related]
  const limited = opts.limit === undefined ? candidates : candidates.slice(0, opts.limit)
  const matched = candidates.length

  // The footer is always the last thing rendered, in every branch, so its
  // cost has to come out of the same budget as the entries rather than being
  // tacked on afterwards (that would let a run land over maxTokens). Its
  // exact text depends on counts we don't have yet (shown/truncated/the
  // final token total), but digit count only grows with magnitude, so
  // pricing it with the largest values it could ever legitimately show
  // (every candidate truncated, the full maxTokens itself) reserves at least
  // as much as the real footer will cost.
  const footerReserve = footerCost({ totalDocs, matched, shown: matched, truncated: matched, estimatedTokens: maxTokens })
  const budget = Math.max(0, maxTokens - footerReserve)

  const entries: ContextEntry[] = []
  let used = headingCost
  const seenSections = new Set<string>()
  let seenRelated = false

  for (const candidate of limited) {
    if (prefersFull(candidate)) {
      const sectionCost = seenSections.has(candidate.doc.type)
        ? 0
        : estimateTokens(contextSectionHeaderBlock(candidate.doc.type))
      const cost = fullCost(candidate) + sectionCost
      if (used + cost <= budget) {
        entries.push({ ...candidate, mode: 'full' })
        used += cost
        seenSections.add(candidate.doc.type)
        continue
      }
    }
    const relatedCost = seenRelated ? 0 : estimateTokens(contextRelatedHeaderBlock())
    const cost = lineCost(candidate) + relatedCost
    if (used + cost > budget) break
    entries.push({ ...candidate, mode: 'line' })
    used += cost
    seenRelated = true
  }

  if (entries.length === 0) {
    used += estimateTokens(contextNoResultsBlock(query))
  }

  const shown = entries.length
  const truncated = matched - shown
  used += footerCost({ totalDocs, matched, shown, truncated, estimatedTokens: used })

  return { query, totalDocs, matched, shown, truncated, estimatedTokens: used, entries }
}
