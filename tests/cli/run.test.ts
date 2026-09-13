import { describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { run } from '../../src/cli/run'
import type { Io } from '../../src/cli/io'
import { CliError, EXIT } from '../../src/cli/exit'
import { parseArgv } from '../../src/cli/args'
import { makeCtx } from '../../src/cli/context'
import { COMMANDS } from '../../src/cli/registry'

function fakeIo(argv: string[], over: Partial<Io> = {}): Io & { outText: () => string; errText: () => string } {
  const out: string[] = []
  const err: string[] = []
  return {
    cwd: process.cwd(),
    env: {},
    argv,
    now: new Date('2026-09-12T00:00:00Z'),
    interactive: false,
    stdout: (s) => out.push(s),
    stderr: (s) => err.push(s),
    readStdin: () => '',
    outText: () => out.join(''),
    errText: () => err.join(''),
    ...over,
  }
}

describe('run', () => {
  test('no command prints help and exits 0', () => {
    const io = fakeIo([])
    expect(run(io)).toBe(EXIT.OK)
    expect(io.outText()).toContain('Commands:')
  })

  test('an unknown command exits 2 and lists the valid ones', () => {
    const io = fakeIo(['frobnicate'])
    expect(run(io)).toBe(EXIT.USAGE)
    expect(io.errText()).toContain('UNKNOWN_COMMAND')
    expect(io.errText()).toContain('context')
  })

  test('an unknown command suggests the closest match', () => {
    const io = fakeIo(['contex'])
    run(io)
    expect(io.errText()).toContain('did you mean: context')
  })

  test('errors go to stderr in human mode and stdout keeps quiet', () => {
    const io = fakeIo(['show'], { env: {} })
    run(io)
    expect(io.outText()).toBe('')
    expect(io.errText().length).toBeGreaterThan(0)
  })

  test('errors go to stdout as an envelope in json mode', () => {
    const io = fakeIo(['frobnicate', '--json'])
    expect(run(io)).toBe(EXIT.USAGE)
    const parsed = JSON.parse(io.outText())
    expect(parsed.ok).toBe(false)
    expect(parsed.error.code).toBe('UNKNOWN_COMMAND')
  })

  test('requireRoot throws NO_MEMORY with an actionable hint when no .project-memory is found', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pm-no-memory-'))
    try {
      const io = fakeIo([], { cwd: dir, env: {} })
      const ctx = makeCtx(io, parseArgv([]))

      let caught: unknown = null
      try {
        ctx.requireRoot()
      } catch (err) {
        caught = err
      }

      expect(caught).toBeInstanceOf(CliError)
      const cliError = caught as CliError
      expect(cliError.code).toBe('NO_MEMORY')
      expect(cliError.exit).toBe(EXIT.NO_MEMORY)
      expect(cliError.payload['hint']).toBe('pm init')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  test('help --json exposes the command spec', () => {
    const io = fakeIo(['help', '--json'])
    expect(run(io)).toBe(EXIT.OK)
    const parsed = JSON.parse(io.outText())
    expect(parsed.data.commands.map((c: { name: string }) => c.name)).toContain('context')
  })

  test('a CliError thrown by a command never leaks a stack trace to stdout', () => {
    const key = '__cli_error__'
    COMMANDS[key] = (_ctx): number => {
      throw new CliError('VALIDATION_FAILED', 'boom', EXIT.INVALID)
    }
    try {
      const io = fakeIo([key])
      const code = run(io)
      expect(code).toBe(EXIT.INVALID)
      expect(io.outText().includes('at ')).toBe(false)
    } finally {
      delete COMMANDS[key]
    }
  })

  test('an unexpected exception from a command becomes an INTERNAL error, never a stack trace on stdout', () => {
    const key = '__boom__'
    COMMANDS[key] = (_ctx): number => {
      throw new Error('boom')
    }
    try {
      const io = fakeIo([key])
      const code = run(io)
      expect(code).toBe(EXIT.USAGE)
      expect(io.outText().includes('at ')).toBe(false)
      expect(io.errText()).toContain('INTERNAL')
    } finally {
      delete COMMANDS[key]
    }
  })

  test('an unexpected exception from a command becomes an INTERNAL error envelope in json mode', () => {
    const key = '__boom__'
    COMMANDS[key] = (_ctx): number => {
      throw new Error('boom')
    }
    try {
      const io = fakeIo([key, '--json'])
      const code = run(io)
      expect(code).toBe(EXIT.USAGE)
      expect(io.outText().includes('at ')).toBe(false)
      const parsed = JSON.parse(io.outText())
      expect(parsed.ok).toBe(false)
      expect(parsed.error.code).toBe('INTERNAL')
    } finally {
      delete COMMANDS[key]
    }
  })
})
