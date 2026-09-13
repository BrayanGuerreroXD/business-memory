import { describe, expect, test } from 'bun:test'
import { normalize, splitIdentifier, tokenize, tokenizeAll, isStopword } from '../../src/domain/text'

describe('normalize', () => {
  test('lowercases and strips diacritics', () => {
    expect(normalize('Cancelación')).toBe('cancelacion')
    expect(normalize('PÓLIZA')).toBe('poliza')
  })

  test('leaves ascii untouched', () => {
    expect(normalize('cancellation')).toBe('cancellation')
  })
})

describe('splitIdentifier', () => {
  test('splits PascalCase into words', () => {
    expect(splitIdentifier('PolicyCancellationService')).toEqual(['policy', 'cancellation', 'service'])
  })

  test('splits camelCase into words', () => {
    expect(splitIdentifier('paymentRetryPolicy')).toEqual(['payment', 'retry', 'policy'])
  })

  test('handles consecutive capitals', () => {
    expect(splitIdentifier('HTTPClient')).toEqual(['http', 'client'])
  })

  test('returns a single word unchanged', () => {
    expect(splitIdentifier('payment')).toEqual(['payment'])
  })
})

describe('tokenizeAll', () => {
  test('keeps duplicates in order', () => {
    expect(tokenizeAll('payment payment retry')).toEqual(['payment', 'payment', 'retry'])
  })

  test('expands identifiers and keeps the original token', () => {
    expect(tokenizeAll('PolicyService')).toEqual(['policyservice', 'policy', 'service'])
  })
})

describe('tokenize', () => {
  test('splits on non-alphanumeric and normalizes', () => {
    expect(tokenize('Cancelación de póliza')).toEqual(['cancelacion', 'poliza'])
  })

  test('drops stopwords in both languages', () => {
    expect(tokenize('the policy and la poliza')).toEqual(['policy', 'poliza'])
  })

  test('deduplicates preserving first-seen order', () => {
    expect(tokenize('payment payment retry payment')).toEqual(['payment', 'retry'])
  })

  test('expands identifiers into their component words', () => {
    expect(tokenize('PolicyCancellationService')).toEqual([
      'policycancellationservice',
      'policy',
      'cancellation',
      'service',
    ])
  })

  test('keeps digits', () => {
    expect(tokenize('feature 431')).toEqual(['feature', '431'])
  })

  test('an empty string yields no tokens', () => {
    expect(tokenize('   ')).toEqual([])
  })
})

describe('isStopword', () => {
  test('covers the minimal es and en lists', () => {
    expect(isStopword('the')).toBe(true)
    expect(isStopword('de')).toBe(true)
    expect(isStopword('policy')).toBe(false)
  })
})
