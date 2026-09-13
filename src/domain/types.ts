export type DocType = 'rule' | 'flow' | 'decision' | 'feature'
export type DocStatus = 'active' | 'superseded'

export interface Frontmatter {
  id: string
  type: DocType
  title: string
  tags: string[]
  source: string | null
  status: DocStatus
  superseded_by: string | null
  links: string[]
  refs: string[]
  created: string
}

export interface IndexedDoc {
  id: string
  type: DocType
  title: string
  tags: string[]
  refs: string[]
  links: string[]
  status: DocStatus
  supersededBy: string | null
  created: string
  path: string
  hash: string
  body: string
}

export interface IndexFile {
  version: 1
  root: string
  docs: Record<string, IndexedDoc>
}

export interface MemoryIndex {
  file: IndexFile
  backlinks: Map<string, Set<string>>
  storage: 'disk' | 'tmp' | 'memory'
}

export interface ScoredDoc {
  doc: IndexedDoc
  score: number
  origin: 'seed' | 'related'
}

export interface ContextEntry extends ScoredDoc {
  mode: 'full' | 'line'
}

export interface ContextResult {
  query: string
  totalDocs: number
  matched: number
  shown: number
  truncated: number
  estimatedTokens: number
  entries: ContextEntry[]
}

export function isDocType(v: unknown): v is DocType {
  return v === 'rule' || v === 'flow' || v === 'decision' || v === 'feature'
}

export function isDocStatus(v: unknown): v is DocStatus {
  return v === 'active' || v === 'superseded'
}
