import { describe, expect, test } from 'bun:test'
import { claudeAdapter, agentsBlock, spliceBlock, BEGIN, END } from '../../src/skill/adapters'

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
})

describe('agentsBlock', () => {
  test('is wrapped in regenerable markers', () => {
    const b = agentsBlock(CANONICAL)
    expect(b.startsWith(BEGIN)).toBe(true)
    expect(b.trimEnd().endsWith(END)).toBe(true)
  })
})

describe('spliceBlock', () => {
  test('appends when no block exists', () => {
    const out = spliceBlock('# My agents file\n\nMy own rules.\n', agentsBlock(CANONICAL))
    expect(out).toContain('My own rules.')
    expect(out).toContain(BEGIN)
  })

  test('replaces only the block on a second run', () => {
    const first = spliceBlock('# Mine\n\nKeep me.\n', agentsBlock('v1\n'))
    const second = spliceBlock(first, agentsBlock('v2\n'))
    expect(second).toContain('Keep me.')
    expect(second).toContain('v2')
    expect(second).not.toContain('v1')
    expect(second.match(new RegExp(BEGIN, 'g'))?.length).toBe(1)
  })

  test('handles an empty existing file', () => {
    expect(spliceBlock('', agentsBlock(CANONICAL))).toContain(BEGIN)
  })

  test('never emits CRLF', () => {
    expect(spliceBlock('# Mine\r\n\r\nKeep me.\r\n', agentsBlock(CANONICAL))).not.toContain('\r')
  })
})
