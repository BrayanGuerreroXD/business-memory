import { join } from 'node:path'
import type { IndexFile, IndexedDoc } from '../domain/types'
import { INDEX_VERSION, MEMORY_DIR, SKILL_FILE } from '../domain/constants'
import { parseYamlSubset, splitFrontmatter, validateFrontmatter } from '../domain/frontmatter'
import { readText, walkMarkdown } from '../store/fs'
import { hashContent } from './hash'

const WIKI_LINK = /\[\[([A-Za-z0-9_-]+)\]\]/g

function mergeLinks(frontmatterLinks: string[], body: string): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  const push = (id: string): void => {
    if (seen.has(id)) return
    seen.add(id)
    out.push(id)
  }
  for (const l of frontmatterLinks) push(l)
  for (const m of body.matchAll(WIKI_LINK)) push(m[1] as string)
  return out
}

export function buildIndex(
  memRoot: string,
  previous: IndexFile | null,
): { file: IndexFile; warnings: string[] } {
  const docs: Record<string, IndexedDoc> = {}
  const warnings: string[] = []
  const byPath = new Map<string, IndexedDoc>()
  if (previous !== null) {
    for (const d of Object.values(previous.docs)) byPath.set(d.path, d)
  }

  for (const rel of walkMarkdown(memRoot)) {
    if (rel === SKILL_FILE) continue

    const raw = readText(join(memRoot, rel))
    const hash = hashContent(raw)

    const cached = byPath.get(rel)
    if (cached !== undefined && cached.hash === hash) {
      if (docs[cached.id] !== undefined) {
        warnings.push(
          `${rel}: duplicate id '${cached.id}' (also in ${(docs[cached.id] as IndexedDoc).path})`,
        )
        continue
      }
      docs[cached.id] = cached
      continue
    }

    const split = splitFrontmatter(raw)
    if (split === null) {
      warnings.push(`${rel}: no frontmatter block`)
      continue
    }

    let parsed: Record<string, unknown>
    try {
      parsed = parseYamlSubset(split.yaml)
    } catch (err) {
      warnings.push(`${rel}: ${(err as Error).message}`)
      continue
    }

    const validated = validateFrontmatter(parsed)
    if (!validated.ok) {
      warnings.push(`${rel}: ${validated.errors.join('; ')}`)
      continue
    }

    const fm = validated.value

    if (docs[fm.id] !== undefined) {
      warnings.push(`${rel}: duplicate id '${fm.id}' (also in ${(docs[fm.id] as IndexedDoc).path})`)
      continue
    }

    docs[fm.id] = {
      id: fm.id,
      type: fm.type,
      title: fm.title,
      tags: fm.tags,
      refs: fm.refs,
      links: mergeLinks(fm.links, split.body),
      status: fm.status,
      supersededBy: fm.superseded_by,
      created: fm.created,
      path: rel,
      hash,
      body: split.body,
    }
  }

  return { file: { version: INDEX_VERSION, root: MEMORY_DIR, docs }, warnings }
}
