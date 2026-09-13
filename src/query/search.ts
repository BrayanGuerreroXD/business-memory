import type { DocType, MemoryIndex, ScoredDoc } from '../domain/types'
import { scoreDocs } from '../domain/scoring'

export interface SearchOptions {
  limit?: number
  type?: DocType
  includeSuperseded?: boolean
}

export function search(index: MemoryIndex, query: string, opts: SearchOptions = {}): ScoredDoc[] {
  const scoreOpts: Parameters<typeof scoreDocs>[2] = {}
  if (opts.type !== undefined) scoreOpts.type = opts.type
  if (opts.includeSuperseded !== undefined) scoreOpts.includeSuperseded = opts.includeSuperseded

  const hits = scoreDocs(index, query, scoreOpts)
  return opts.limit === undefined ? hits : hits.slice(0, opts.limit)
}
