import { describe, expect, test } from 'bun:test'
import { estimateTokens, monthsBetween, ageLabel } from '../../src/domain/tokens'

describe('estimateTokens', () => {
  test('is four characters per token, rounded up', () => {
    expect(estimateTokens('')).toBe(0)
    expect(estimateTokens('abc')).toBe(1)
    expect(estimateTokens('abcd')).toBe(1)
    expect(estimateTokens('abcde')).toBe(2)
  })
})

describe('monthsBetween', () => {
  test('counts whole months', () => {
    expect(monthsBetween('2026-01-15', new Date('2026-09-12T00:00:00Z'))).toBe(7)
    expect(monthsBetween('2025-09-12', new Date('2026-09-12T00:00:00Z'))).toBe(12)
  })

  test('never goes negative for a future date', () => {
    expect(monthsBetween('2027-01-01', new Date('2026-09-12T00:00:00Z'))).toBe(0)
  })
})

describe('ageLabel', () => {
  test('is empty below the threshold', () => {
    expect(ageLabel('2026-01-01', new Date('2026-09-12T00:00:00Z'))).toBe('')
  })

  test('reports months at or above the threshold', () => {
    expect(ageLabel('2025-07-01', new Date('2026-09-12T00:00:00Z'))).toBe(' (14 months old)')
  })
})
