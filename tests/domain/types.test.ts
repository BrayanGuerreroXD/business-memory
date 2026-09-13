import { describe, expect, test } from 'bun:test'
import { isDocType, isDocStatus } from '../../src/domain/types'
import { TYPE_DIR, TYPE_PREFIX, DOC_TYPES } from '../../src/domain/constants'

describe('isDocType', () => {
  test('accepts the four document types', () => {
    for (const t of ['rule', 'flow', 'decision', 'feature']) {
      expect(isDocType(t)).toBe(true)
    }
  })

  test('rejects anything else', () => {
    for (const v of ['Rule', 'rules', '', null, undefined, 3, {}]) {
      expect(isDocType(v)).toBe(false)
    }
  })
})

describe('isDocStatus', () => {
  test('accepts active and superseded only', () => {
    expect(isDocStatus('active')).toBe(true)
    expect(isDocStatus('superseded')).toBe(true)
    expect(isDocStatus('deleted')).toBe(false)
  })
})

describe('constants', () => {
  test('every doc type has a prefix and a directory', () => {
    for (const t of DOC_TYPES) {
      expect(typeof TYPE_PREFIX[t]).toBe('string')
      expect(typeof TYPE_DIR[t]).toBe('string')
    }
  })

  test('prefixes are unique', () => {
    const prefixes = DOC_TYPES.map((t) => TYPE_PREFIX[t])
    expect(new Set(prefixes).size).toBe(prefixes.length)
  })
})
