import { describe, expect, test } from 'bun:test'
import { renderError, didYouMean } from '../../src/render/error'
import { okEnvelope, errEnvelope } from '../../src/render/json'

describe('didYouMean', () => {
  test('prefers a prefix match', () => {
    expect(didYouMean('rule-open-claims', ['rule-open-claims-restriction', 'rule-payment'])).toBe(
      'rule-open-claims-restriction',
    )
  })

  test('falls back to a close edit distance', () => {
    expect(didYouMean('rule-paymnt', ['rule-payment', 'flow-renewal'])).toBe('rule-payment')
  })

  test('returns null when nothing is close', () => {
    expect(didYouMean('zzzzzz', ['rule-payment'])).toBeNull()
  })

  test('returns null for an empty candidate list', () => {
    expect(didYouMean('rule-x', [])).toBeNull()
  })
})

describe('renderError', () => {
  test('states the error, the code, the suggestion and the hint', () => {
    const out = renderError({
      code: 'NOT_FOUND',
      message: "no doc with id 'rule-open-claims'",
      hint: 'pm search "open claims"',
      didYouMean: 'rule-open-claims-restriction',
    })
    expect(out).toContain("error: no doc with id 'rule-open-claims'  [NOT_FOUND]")
    expect(out).toContain('did you mean: rule-open-claims-restriction')
    expect(out).toContain('hint: pm search "open claims"')
  })

  test('omits the optional lines when absent', () => {
    const out = renderError({ code: 'NO_MEMORY', message: 'no .business-memory directory found' })
    expect(out).not.toContain('did you mean')
    expect(out).not.toContain('hint:')
  })
})

describe('envelopes', () => {
  test('the success envelope carries ok true and the data', () => {
    expect(JSON.parse(okEnvelope({ id: 'rule-x' }))).toEqual({ ok: true, data: { id: 'rule-x' } })
  })

  test('the error envelope carries ok false and every extra field', () => {
    const parsed = JSON.parse(errEnvelope({ code: 'SIMILAR_DOCS', message: '1 similar doc found', similar: [{ id: 'rule-a' }] }))
    expect(parsed.ok).toBe(false)
    expect(parsed.error.code).toBe('SIMILAR_DOCS')
    expect(parsed.error.similar).toEqual([{ id: 'rule-a' }])
  })

  test('envelopes are single-line json ending in a newline', () => {
    const s = okEnvelope({ a: 1 })
    expect(s.endsWith('\n')).toBe(true)
    expect(s.trimEnd().includes('\n')).toBe(false)
  })
})
