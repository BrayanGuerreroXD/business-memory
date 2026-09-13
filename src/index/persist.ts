import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { IndexFile, MemoryIndex } from '../domain/types'
import { INDEX_FILE, INDEX_VERSION } from '../domain/constants'
import { atomicWrite } from '../store/fs'
import { buildIndex } from './build'
import { buildBacklinks } from './backlinks'

export function indexPath(memRoot: string): string {
  return join(memRoot, INDEX_FILE)
}

function fallbackPath(memRoot: string): string {
  const key = createHash('sha256').update(memRoot).digest('hex').slice(0, 16)
  return join(tmpdir(), 'project-memory-cache', key, INDEX_FILE)
}

function readCache(abs: string): IndexFile | null {
  try {
    const parsed = JSON.parse(readFileSync(abs, 'utf8')) as IndexFile
    if (parsed.version !== INDEX_VERSION || typeof parsed.docs !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

export function saveIndex(memRoot: string, file: IndexFile): 'disk' | 'tmp' | 'memory' {
  const json = `${JSON.stringify(file, null, 0)}\n`
  try {
    atomicWrite(indexPath(memRoot), json)
    return 'disk'
  } catch {
    /* fall through */
  }
  try {
    const fb = fallbackPath(memRoot)
    mkdirSync(join(fb, '..'), { recursive: true })
    atomicWrite(fb, json)
    return 'tmp'
  } catch {
    return 'memory'
  }
}

export function loadIndex(memRoot: string): MemoryIndex {
  const primary = indexPath(memRoot)
  const fallback = fallbackPath(memRoot)
  const previous =
    (existsSync(primary) ? readCache(primary) : null) ??
    (existsSync(fallback) ? readCache(fallback) : null)

  const { file, warnings } = buildIndex(memRoot, previous)

  const unchanged =
    previous !== null &&
    Object.keys(previous.docs).length === Object.keys(file.docs).length &&
    Object.values(file.docs).every(
      (d) => previous.docs[d.id]?.hash === d.hash && previous.docs[d.id]?.path === d.path,
    )

  const storage = unchanged && existsSync(primary) ? 'disk' : saveIndex(memRoot, file)

  return { file, backlinks: buildBacklinks(file), storage, warnings }
}
