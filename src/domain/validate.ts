import type { MemoryIndex } from './types'
import { slugify } from './slug'
import { monthsBetween } from './tokens'
import { AGE_WARN_MONTHS } from './constants'

export interface Finding {
  level: 'error' | 'warning'
  id: string | null
  path: string | null
  message: string
}

const SPANISH_HINT = /\b(de|la|el|los|las|una?|para|con|sin|por|que)\b/i

export function validateIndex(index: MemoryIndex, indexWarnings: string[], now: Date): Finding[] {
  const findings: Finding[] = []
  const docs = Object.values(index.file.docs)

  // Forward indexer warnings as errors
  for (const w of indexWarnings) {
    findings.push({ level: 'error', id: null, path: w.split(':')[0] ?? null, message: w })
  }

  // Check each document
  for (const doc of docs) {
    // Check filename matches id
    const fileName = doc.path.split('/').pop() ?? ''
    if (fileName !== `${doc.id}.md`) {
      findings.push({
        level: 'error',
        id: doc.id,
        path: doc.path,
        message: `id '${doc.id}' does not match filename '${fileName}'`,
      })
    }

    // Check id is a valid slug for its type
    if (doc.id !== slugify(doc.id.replace(/^[a-z]+-/, ''), doc.type) && !/^[a-z]+(-[a-z0-9]+)+(-\d+)?$/.test(doc.id)) {
      findings.push({
        level: 'error',
        id: doc.id,
        path: doc.path,
        message: `id '${doc.id}' is not a valid slug`,
      })
    }

    // Check all links exist
    for (const target of doc.links) {
      if (index.file.docs[target] === undefined) {
        findings.push({
          level: 'error',
          id: doc.id,
          path: doc.path,
          message: `broken link to '${target}'`,
        })
      }
    }

    // Check superseded_by target exists
    if (doc.status === 'superseded') {
      const by = doc.supersededBy
      if (by === null || index.file.docs[by] === undefined) {
        findings.push({
          level: 'error',
          id: doc.id,
          path: doc.path,
          message: `superseded_by '${by ?? 'null'}' does not exist`,
        })
      }
    }

    // Warn about old documents
    const age = monthsBetween(doc.created, now)
    if (age >= AGE_WARN_MONTHS) {
      findings.push({
        level: 'warning',
        id: doc.id,
        path: doc.path,
        message: `${age} months old — confirm it is still true`,
      })
    }

    // Warn about orphan documents (no links in or out)
    if (doc.links.length === 0 && (index.backlinks.get(doc.id)?.size ?? 0) === 0) {
      findings.push({
        level: 'warning',
        id: doc.id,
        path: doc.path,
        message: 'no links to or from this document',
      })
    }

    // Warn about Spanish-looking titles or tags
    // SPANISH_HINT matches Spanish function words; it won't catch single-word Spanish nouns.
    // That's intentional: a broader pattern would false-positive on English text.
    if (SPANISH_HINT.test(doc.title)) {
      findings.push({
        level: 'warning',
        id: doc.id,
        path: doc.path,
        message: 'title looks Spanish — title and tags are canonically English',
      })
    } else {
      // Check tags only if title didn't already trigger
      for (const tag of doc.tags) {
        if (SPANISH_HINT.test(tag)) {
          findings.push({
            level: 'warning',
            id: doc.id,
            path: doc.path,
            message: `tag '${tag}' looks Spanish — title and tags are canonically English`,
          })
          break // One warning per document is enough
        }
      }
    }
  }

  // Check for supersession cycles
  for (const doc of docs) {
    if (doc.status !== 'superseded' || doc.supersededBy === null) continue
    const seen = new Set<string>([doc.id])
    let cursor = index.file.docs[doc.supersededBy]
    while (cursor !== undefined && cursor.status === 'superseded' && cursor.supersededBy !== null) {
      if (seen.has(cursor.id)) {
        findings.push({
          level: 'error',
          id: doc.id,
          path: doc.path,
          message: `supersession cycle through '${cursor.id}'`,
        })
        break
      }
      seen.add(cursor.id)
      cursor = index.file.docs[cursor.supersededBy]
    }
  }

  return findings
}
