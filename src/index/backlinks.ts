import type { IndexFile } from '../domain/types'

export function buildBacklinks(file: IndexFile): Map<string, Set<string>> {
  const back = new Map<string, Set<string>>()
  for (const doc of Object.values(file.docs)) {
    for (const target of doc.links) {
      if (file.docs[target] === undefined) continue
      const set = back.get(target) ?? new Set<string>()
      set.add(doc.id)
      back.set(target, set)
    }
  }
  return back
}
