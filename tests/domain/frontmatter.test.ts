import { describe, expect, test } from 'bun:test'
import {
  splitFrontmatter,
  parseYamlSubset,
  validateFrontmatter,
  serializeDoc,
} from '../../src/domain/frontmatter'
import type { Frontmatter } from '../../src/domain/types'

const VALID: Frontmatter = {
  id: 'rule-open-claims-restriction',
  type: 'rule',
  title: 'Open claims restriction',
  tags: ['policies', 'cancellation'],
  source: 'Reunion con operaciones 2026-08-30',
  status: 'active',
  superseded_by: null,
  links: ['dec-domain-validation'],
  refs: ['PolicyCancellationService'],
  created: '2026-09-12',
}

describe('splitFrontmatter', () => {
  test('separates the yaml block from the body', () => {
    const raw = '---\nid: x\n---\n\n# Title\n\nBody text.\n'
    const out = splitFrontmatter(raw)
    expect(out?.yaml).toBe('id: x')
    expect(out?.body).toBe('# Title\n\nBody text.')
  })

  test('tolerates CRLF input', () => {
    const raw = '---\r\nid: x\r\n---\r\n\r\nBody.\r\n'
    expect(splitFrontmatter(raw)?.body).toBe('Body.')
  })

  test('returns null when there is no frontmatter', () => {
    expect(splitFrontmatter('# Just a heading\n')).toBeNull()
  })
})

describe('parseYamlSubset', () => {
  test('reads scalars, null and block sequences', () => {
    const v = parseYamlSubset(
      ['id: rule-x', 'title: "Quoted: title"', 'superseded_by: null', 'tags:', '  - a', '  - b'].join('\n'),
    )
    expect(v).toEqual({ id: 'rule-x', title: 'Quoted: title', superseded_by: null, tags: ['a', 'b'] })
  })

  test('reads an empty inline sequence', () => {
    expect(parseYamlSubset('tags: []')).toEqual({ tags: [] })
  })

  test('rejects constructs outside the subset with a line number', () => {
    expect(() => parseYamlSubset('a:\n  b: 1')).toThrow('line 2')
  })
})

describe('validateFrontmatter', () => {
  test('accepts a valid rule', () => {
    const r = validateFrontmatter({ ...VALID })
    expect(r.ok).toBe(true)
  })

  test('requires source on rule and decision', () => {
    const r = validateFrontmatter({ ...VALID, source: null })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.join(' ')).toContain('source is required for type rule')
  })

  test('does not require source on flow or feature', () => {
    const r = validateFrontmatter({ ...VALID, type: 'flow', id: 'flow-x', source: null })
    expect(r.ok).toBe(true)
  })

  test('rejects an unknown type', () => {
    const r = validateFrontmatter({ ...VALID, type: 'policy' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.join(' ')).toContain('type')
  })

  test('superseded requires superseded_by', () => {
    const r = validateFrontmatter({ ...VALID, status: 'superseded' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.join(' ')).toContain('superseded_by is required')
  })

  test('active forbids superseded_by', () => {
    const r = validateFrontmatter({ ...VALID, superseded_by: 'rule-other' })
    expect(r.ok).toBe(false)
  })

  test('rejects a malformed created date', () => {
    const r = validateFrontmatter({ ...VALID, created: '12/09/2026' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.join(' ')).toContain('created')
  })

  test('reports every error at once, not just the first', () => {
    const r = validateFrontmatter({ type: 'rule' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.length).toBeGreaterThan(2)
  })
})

describe('serializeDoc', () => {
  test('writes lists as block sequences and ends with a single newline', () => {
    const out = serializeDoc(VALID, '# Open claims restriction\n\nBody.')
    expect(out).toContain('tags:\n  - policies\n  - cancellation\n')
    expect(out.endsWith('\n')).toBe(true)
    expect(out.endsWith('\n\n')).toBe(false)
  })

  test('never emits CRLF', () => {
    const out = serializeDoc(VALID, 'a\r\nb')
    expect(out).not.toContain('\r')
  })

  test('quotes values that need it', () => {
    const out = serializeDoc({ ...VALID, title: 'Title: with colon' }, 'x')
    expect(out).toContain('title: "Title: with colon"')
  })

  test('round-trips through split and parse', () => {
    const out = serializeDoc(VALID, 'Body.')
    const split = splitFrontmatter(out)
    expect(split).not.toBeNull()
    const parsed = validateFrontmatter(parseYamlSubset(split!.yaml))
    expect(parsed.ok).toBe(true)
    if (parsed.ok) expect(parsed.value).toEqual(VALID)
  })

  test('empty lists round-trip', () => {
    const fm = { ...VALID, tags: [], links: [], refs: [] }
    const split = splitFrontmatter(serializeDoc(fm, 'x'))
    const parsed = validateFrontmatter(parseYamlSubset(split!.yaml))
    expect(parsed.ok).toBe(true)
    if (parsed.ok) expect(parsed.value.tags).toEqual([])
  })
})
