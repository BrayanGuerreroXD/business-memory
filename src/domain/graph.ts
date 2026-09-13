import type { MemoryIndex, ScoredDoc } from './types'
import { MAX_NEIGHBORS_PER_SEED, NEIGHBOR_WEIGHT } from './constants'

export interface ExpandOptions {
  includeSuperseded?: boolean
  maxPerSeed?: number
}

export function neighbors(index: MemoryIndex, id: string): string[] {
  const doc = index.file.docs[id]
  if (doc === undefined) return []

  const out = new Set<string>()
  for (const target of doc.links) {
    if (target !== id && index.file.docs[target] !== undefined) out.add(target)
  }
  for (const source of index.backlinks.get(id) ?? []) {
    if (source !== id) out.add(source)
  }
  return [...out].sort()
}

export function degree(index: MemoryIndex, id: string): number {
  return Math.max(1, neighbors(index, id).length)
}

export function expand(
  index: MemoryIndex,
  seeds: ScoredDoc[],
  opts: ExpandOptions = {},
): ScoredDoc[] {
  const maxPerSeed = opts.maxPerSeed ?? MAX_NEIGHBORS_PER_SEED
  const seedIds = new Set(seeds.map((s) => s.doc.id))
  const best = new Map<string, number>()

  for (const seed of seeds) {
    const candidates: Array<{ id: string; weight: number }> = []

    for (const nid of neighbors(index, seed.doc.id)) {
      if (seedIds.has(nid)) continue
      const doc = index.file.docs[nid]
      if (doc === undefined) continue
      if (doc.status === 'superseded' && opts.includeSuperseded !== true) continue
      candidates.push({ id: nid, weight: (seed.score * NEIGHBOR_WEIGHT) / Math.sqrt(degree(index, nid)) })
    }

    candidates.sort((a, b) => (b.weight - a.weight) || a.id.localeCompare(b.id))

    for (const c of candidates.slice(0, maxPerSeed)) {
      const previous = best.get(c.id)
      if (previous === undefined || c.weight > previous) best.set(c.id, c.weight)
    }
  }

  const out: ScoredDoc[] = []
  for (const [id, score] of best) {
    out.push({ doc: index.file.docs[id]!, score, origin: 'related' })
  }
  out.sort((a, b) => (b.score - a.score) || a.doc.id.localeCompare(b.doc.id))
  return out
}
