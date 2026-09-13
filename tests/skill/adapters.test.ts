import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { claudeAdapter, agentsBlock, spliceBlock, BEGIN, END } from '../../src/skill/adapters'
import { SKILL_MARKDOWN } from '../../src/skill/content'

const CANONICAL = '# project-memory protocol\n\nRun `pm context` before planning.\n'

describe('claudeAdapter', () => {
  test('targets the claude skills path', () => {
    expect(claudeAdapter(CANONICAL).path).toBe('.claude/skills/project-memory/SKILL.md')
  })

  test('prepends frontmatter with a name and a description', () => {
    const { content } = claudeAdapter(CANONICAL)
    expect(content.startsWith('---\n')).toBe(true)
    expect(content).toContain('name: project-memory')
    expect(content).toContain('description:')
  })

  test('keeps the canonical body verbatim', () => {
    expect(claudeAdapter(CANONICAL).content).toContain('Run `pm context` before planning.')
  })

  test('quotes the description so a colon or quote in it cannot break YAML parsing', () => {
    const { content } = claudeAdapter(CANONICAL)
    const line = content.split('\n').find((l) => l.startsWith('description:'))
    expect(line).toBeDefined()
    expect(line?.startsWith('description: "')).toBe(true)
    const value = line?.slice('description: '.length) ?? ''
    expect(() => JSON.parse(value)).not.toThrow()
  })
})

describe('agentsBlock', () => {
  test('is wrapped in regenerable markers', () => {
    const b = agentsBlock(CANONICAL)
    expect(b.startsWith(BEGIN)).toBe(true)
    expect(b.trimEnd().endsWith(END)).toBe(true)
  })
})

describe('spliceBlock', () => {
  function spliced(existing: string, block: string): string {
    const result = spliceBlock(existing, block)
    if (!result.ok) throw new Error('expected a successful splice')
    return result.text
  }

  test('appends when no block exists', () => {
    const out = spliced('# My agents file\n\nMy own rules.\n', agentsBlock(CANONICAL))
    expect(out).toContain('My own rules.')
    expect(out).toContain(BEGIN)
  })

  test('replaces only the block on a second run', () => {
    const first = spliced('# Mine\n\nKeep me.\n', agentsBlock('v1\n'))
    const second = spliced(first, agentsBlock('v2\n'))
    expect(second).toContain('Keep me.')
    expect(second).toContain('v2')
    expect(second).not.toContain('v1')
    expect(second.match(new RegExp(BEGIN, 'g'))?.length).toBe(1)
  })

  test('handles an empty existing file', () => {
    expect(spliced('', agentsBlock(CANONICAL))).toContain(BEGIN)
  })

  test('never emits CRLF', () => {
    expect(spliced('# Mine\r\n\r\nKeep me.\r\n', agentsBlock(CANONICAL))).not.toContain('\r')
  })

  test('refuses to splice when a marker appears inside documentation, e.g. a fenced example', () => {
    const withExample = [
      '# Mine',
      '',
      'Our AGENTS.md integrates project-memory like so:',
      '',
      '```',
      BEGIN,
      '...',
      END,
      '```',
      '',
      BEGIN,
      'v1',
      END,
      '',
    ].join('\n')

    const result = spliceBlock(withExample, agentsBlock('v2\n'))
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.beginCount).toBe(2)
    expect(result.endCount).toBe(2)
  })

  test('refuses to splice when END appears before BEGIN', () => {
    const backwards = `${END}\nleftover\n${BEGIN}\n`
    expect(spliceBlock(backwards, agentsBlock(CANONICAL)).ok).toBe(false)
  })

  test('refuses to splice when only one of BEGIN/END is present', () => {
    expect(spliceBlock(`# Mine\n${BEGIN}\n`, agentsBlock(CANONICAL)).ok).toBe(false)
    expect(spliceBlock(`# Mine\n${END}\n`, agentsBlock(CANONICAL)).ok).toBe(false)
  })

  test('reports the marker counts so the caller can name the problem', () => {
    const result = spliceBlock(`${BEGIN}\n${BEGIN}\n${END}\n`, agentsBlock(CANONICAL))
    if (result.ok) throw new Error('expected a refusal')
    expect(result.beginCount).toBe(2)
    expect(result.endCount).toBe(1)
  })

  test('the adapter layer does not import the CLI exit codes', () => {
    const source = readFileSync(join(import.meta.dir, '..', '..', 'src', 'skill', 'adapters.ts'), 'utf8')
    expect(source).not.toContain('cli/exit')
  })
})

describe('the canonical protocol', () => {
  test('tells the agent to link, tag and reference a new note', () => {
    expect(SKILL_MARKDOWN).toContain('--links')
    expect(SKILL_MARKDOWN).toContain('--tags')
    expect(SKILL_MARKDOWN).toContain('--refs')
    expect(SKILL_MARKDOWN).toContain('[[id]]')
  })

  test('names an update that actually changes something', () => {
    expect(SKILL_MARKDOWN).toContain('pm update <id> --stub')
    expect(SKILL_MARKDOWN).toContain('--status superseded --superseded-by')
  })

  test('the eval fixture SKILL.md is the canonical text, byte for byte', () => {
    const fixture = join(import.meta.dir, '..', '..', 'eval', 'fixture', '.project-memory', 'SKILL.md')
    expect(readFileSync(fixture, 'utf8')).toBe(SKILL_MARKDOWN)
  })
})
