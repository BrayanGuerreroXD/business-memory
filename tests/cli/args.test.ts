import { describe, expect, test } from 'bun:test'
import { parseArgv } from '../../src/cli/args'

describe('parseArgv', () => {
  test('reads the command and positionals', () => {
    const a = parseArgv(['show', 'rule-a', 'rule-b'])
    expect(a.command).toBe('show')
    expect(a.positionals).toEqual(['rule-a', 'rule-b'])
  })

  test('reads --flag value and --flag=value alike', () => {
    expect(parseArgv(['add', '--title', 'A B']).flags['title']).toBe('A B')
    expect(parseArgv(['add', '--title=A B']).flags['title']).toBe('A B')
  })

  test('treats a flag with no value as boolean true', () => {
    expect(parseArgv(['add', '--stub']).flags['stub']).toBe(true)
  })

  test('a flag followed by another flag stays boolean', () => {
    const a = parseArgv(['add', '--stub', '--json'])
    expect(a.flags['stub']).toBe(true)
    expect(a.flags['json']).toBe(true)
  })

  test('accepts the aliases agents hallucinate', () => {
    expect(parseArgv(['list', '--format', 'json']).flags['json']).toBe(true)
    expect(parseArgv(['list', '-t', 'rule']).flags['type']).toBe('rule')
  })

  test('--format with a non-json value is not treated as --json', () => {
    expect(parseArgv(['list', '--format', 'yaml']).flags['json']).toBeUndefined()
  })

  test('a bare dash is a positional, meaning stdin', () => {
    expect(parseArgv(['add', 'rule', '-']).positionals).toEqual(['rule', '-'])
  })

  test('an empty argv has a null command', () => {
    expect(parseArgv([]).command).toBeNull()
  })

  test('a negative-looking value is still consumed as a value', () => {
    expect(parseArgv(['context', 'x', '--max-tokens', '-1']).flags['max-tokens']).toBe('-1')
  })
})

describe('parseArgv with boolean flags before positionals', () => {
  test('--json before the id keeps the id as a positional', () => {
    const a = parseArgv(['show', '--json', 'rule-x'])
    expect(a.command).toBe('show')
    expect(a.flags['json']).toBe(true)
    expect(a.positionals).toEqual(['rule-x'])
  })

  test('--json before a context query keeps the query', () => {
    const a = parseArgv(['context', '--json', 'refund approval'])
    expect(a.flags['json']).toBe(true)
    expect(a.positionals).toEqual(['refund approval'])
  })

  test('--stub before the type keeps the type', () => {
    const a = parseArgv(['add', '--stub', 'rule', '--title', 'T'])
    expect(a.flags['stub']).toBe(true)
    expect(a.positionals).toEqual(['rule'])
    expect(a.flags['title']).toBe('T')
  })

  test('a boolean flag between two positionals swallows neither', () => {
    const a = parseArgv(['show', 'rule-a', '--json', 'rule-b'])
    expect(a.flags['json']).toBe(true)
    expect(a.positionals).toEqual(['rule-a', 'rule-b'])
  })

  test('a boolean flag between the command and the query of context', () => {
    const a = parseArgv(['context', 'refunds', '--no-expand', 'extra'])
    expect(a.flags['no-expand']).toBe(true)
    expect(a.positionals).toEqual(['refunds', 'extra'])
  })

  test('a boolean flag immediately before another flag stays boolean', () => {
    const a = parseArgv(['add', 'rule', '--force', '--title', 'T'])
    expect(a.flags['force']).toBe(true)
    expect(a.flags['title']).toBe('T')
    expect(a.positionals).toEqual(['rule'])
  })

  test('every boolean flag of the CLI refuses to eat the next token', () => {
    for (const name of ['json', 'stub', 'force', 'all', 'no-expand', 'no-color', 'yes', 'help']) {
      const a = parseArgv(['show', `--${name}`, 'rule-x'])
      expect(a.flags[name]).toBe(true)
      expect(a.positionals).toEqual(['rule-x'])
    }
  })

  test('an explicit --json=false is false and --json=true is true', () => {
    expect(parseArgv(['show', '--json=false', 'rule-x']).flags['json']).toBe(false)
    expect(parseArgv(['show', '--json=true', 'rule-x']).flags['json']).toBe(true)
  })

  test('a value-taking flag still consumes the token after it', () => {
    const a = parseArgv(['add', 'rule', '--title', 'Refund window', '--stub'])
    expect(a.flags['title']).toBe('Refund window')
    expect(a.flags['stub']).toBe(true)
    expect(a.positionals).toEqual(['rule'])
  })
})
