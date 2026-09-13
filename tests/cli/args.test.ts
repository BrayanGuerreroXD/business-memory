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
