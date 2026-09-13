import { describe, expect, test } from 'bun:test'
import { slugify, ensureUniqueSlug } from '../../src/domain/slug'

describe('slugify', () => {
  test('prefixes by type', () => {
    expect(slugify('Open claims restriction', 'rule')).toBe('rule-open-claims-restriction')
    expect(slugify('Domain validation', 'decision')).toBe('dec-domain-validation')
    expect(slugify('Policy cancellation', 'flow')).toBe('flow-policy-cancellation')
    expect(slugify('Feature 431', 'feature')).toBe('feature-feature-431')
  })

  test('strips diacritics', () => {
    expect(slugify('Restricción de reclamos', 'rule')).toBe('rule-restriccion-de-reclamos')
  })

  test('collapses punctuation and repeated dashes', () => {
    expect(slugify('Payment  --  retry / policy!', 'rule')).toBe('rule-payment-retry-policy')
  })

  test('truncates to 60 characters without a trailing dash', () => {
    const long = slugify('a'.repeat(120), 'rule')
    expect(long.length).toBeLessThanOrEqual(60)
    expect(long.endsWith('-')).toBe(false)
  })

  test('truncation never cuts mid-word leaving a dash', () => {
    const s = slugify('renewed policies must keep the original payment method forever', 'rule')
    expect(s.length).toBeLessThanOrEqual(60)
    expect(s).not.toMatch(/-$/)
  })

  test('a title that reduces to nothing throws', () => {
    expect(() => slugify('!!! ???', 'rule')).toThrow('title produces an empty slug')
  })

  test('windows reserved names are neutralised by the prefix', () => {
    expect(slugify('con', 'rule')).toBe('rule-con')
    expect(slugify('nul', 'flow')).toBe('flow-nul')
  })
})

describe('ensureUniqueSlug', () => {
  test('returns the base when free', () => {
    expect(ensureUniqueSlug('rule-payment-retry', new Set())).toBe('rule-payment-retry')
  })

  test('appends an incrementing suffix when taken', () => {
    const taken = new Set(['rule-payment-retry', 'rule-payment-retry-2'])
    expect(ensureUniqueSlug('rule-payment-retry', taken)).toBe('rule-payment-retry-3')
  })

  test('the suffixed slug still respects the length cap', () => {
    const base = 'rule-' + 'a'.repeat(55)
    const out = ensureUniqueSlug(base, new Set([base]))
    expect(out.length).toBeLessThanOrEqual(60)
    expect(out.endsWith('-2')).toBe(true)
  })
})
