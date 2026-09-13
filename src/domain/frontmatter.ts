import type { DocType, Frontmatter } from './types'
import { isDocStatus, isDocType } from './types'

const FIELD_ORDER = [
  'id', 'type', 'title', 'tags', 'source',
  'status', 'superseded_by', 'links', 'refs', 'created',
] as const

export function splitFrontmatter(raw: string): { yaml: string; body: string } | null {
  const text = raw.replace(/\r\n/g, '\n')
  if (!text.startsWith('---\n')) return null

  let end = text.indexOf('\n---\n', 3)
  let bodyAt = end + 5
  if (end === -1) {
    // A closing fence that ends the file, with no trailing newline and no body.
    if (!text.endsWith('\n---')) return null
    end = text.length - 4
    bodyAt = text.length
  }

  return {
    yaml: text.slice(4, end + 1).replace(/\n$/, ''),
    body: text.slice(bodyAt).trim(),
  }
}

function parseScalar(v: string): string | null {
  const t = v.trim()
  if (t === 'null' || t === '~' || t === '') return null
  if (t.startsWith('"') && t.endsWith('"') && t.length >= 2) {
    return t.slice(1, -1).replace(/\\"/g, '"')
  }
  return t
}

export function parseYamlSubset(yaml: string): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const lines = yaml.split('\n')
  let currentKey: string | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    if (line.trim() === '' || line.trimStart().startsWith('#')) continue

    const item = /^ {2}- (.*)$/.exec(line)
    if (item) {
      if (currentKey === null) throw new Error(`unexpected sequence item at line ${i + 1}`)
      ;(out[currentKey] as string[]).push(parseScalar(item[1] ?? '') ?? '')
      continue
    }

    const pair = /^([A-Za-z_][A-Za-z0-9_]*): ?(.*)$/.exec(line)
    if (!pair) throw new Error(`unsupported yaml at line ${i + 1}: ${line}`)

    const key = pair[1] as string
    const rest = pair[2] ?? ''
    if (rest.trim() === '') {
      out[key] = []
      currentKey = key
    } else if (rest.trim() === '[]') {
      out[key] = []
      currentKey = null
    } else {
      out[key] = parseScalar(rest)
      currentKey = null
    }
  }

  return out
}

function asStringArray(v: unknown): string[] | null {
  if (v === null || v === undefined) return []
  if (!Array.isArray(v)) return null
  return v.every((x) => typeof x === 'string') ? (v as string[]) : null
}

export function validateFrontmatter(
  v: Record<string, unknown>,
): { ok: true; value: Frontmatter } | { ok: false; errors: string[] } {
  const errors: string[] = []

  const id = typeof v['id'] === 'string' && v['id'] !== '' ? v['id'] : null
  if (id === null) errors.push('id is required and must be a non-empty string')

  const type = isDocType(v['type']) ? (v['type'] as DocType) : null
  if (type === null) errors.push('type must be one of rule, flow, decision, feature')

  const title = typeof v['title'] === 'string' && v['title'] !== '' ? v['title'] : null
  if (title === null) errors.push('title is required and must be a non-empty string')

  const status = isDocStatus(v['status']) ? v['status'] : null
  if (status === null) errors.push('status must be active or superseded')

  const created = typeof v['created'] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v['created'])
    ? v['created']
    : null
  if (created === null) errors.push('created is required and must be YYYY-MM-DD')

  const tags = asStringArray(v['tags'])
  if (tags === null) errors.push('tags must be a list of strings')
  const links = asStringArray(v['links'])
  if (links === null) errors.push('links must be a list of strings')
  const refs = asStringArray(v['refs'])
  if (refs === null) errors.push('refs must be a list of strings')

  const source = v['source'] === null || v['source'] === undefined ? null : String(v['source'])
  if ((type === 'rule' || type === 'decision') && (source === null || source.trim() === '')) {
    errors.push(`source is required for type ${type}`)
  }

  const supersededBy =
    v['superseded_by'] === null || v['superseded_by'] === undefined
      ? null
      : String(v['superseded_by'])
  if (status === 'superseded' && supersededBy === null) {
    errors.push('superseded_by is required when status is superseded')
  }
  if (status === 'active' && supersededBy !== null) {
    errors.push('superseded_by must be null when status is active')
  }

  if (errors.length > 0) return { ok: false, errors }

  return {
    ok: true,
    value: {
      id: id as string,
      type: type as DocType,
      title: title as string,
      tags: tags as string[],
      source,
      status: status as Frontmatter['status'],
      superseded_by: supersededBy,
      links: links as string[],
      refs: refs as string[],
      created: created as string,
    },
  }
}

function needsQuotes(s: string): boolean {
  return /^[\s]|[\s]$|[:#"]|^(null|true|false|~)$|^-|^\d+$/.test(s)
}

function scalar(v: string | null): string {
  if (v === null) return 'null'
  return needsQuotes(v) ? `"${v.replace(/"/g, '\\"')}"` : v
}

function sequence(key: string, items: string[]): string {
  if (items.length === 0) return `${key}: []`
  return [`${key}:`, ...items.map((i) => `  - ${scalar(i)}`)].join('\n')
}

export function serializeDoc(fm: Frontmatter, body: string): string {
  const lines: string[] = []
  for (const key of FIELD_ORDER) {
    if (key === 'tags' || key === 'links' || key === 'refs') {
      lines.push(sequence(key, fm[key]))
    } else {
      lines.push(`${key}: ${scalar(fm[key] as string | null)}`)
    }
  }
  const clean = body.replace(/\r\n/g, '\n').trim()
  return `---\n${lines.join('\n')}\n---\n\n${clean}\n`
}
