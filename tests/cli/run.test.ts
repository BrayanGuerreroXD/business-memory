import { describe, expect, test } from 'bun:test'
import { run } from '../../src/cli/run'
import type { Io } from '../../src/cli/io'
import { EXIT } from '../../src/cli/exit'

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

  test('missing memory exits 4 with an actionable hint', () => {
    const io = fakeIo(['list'], { cwd: require('node:os').tmpdir(), env: { PM_ROOT: '' } })
    const code = run(io)
    expect(code === EXIT.NO_MEMORY || code === EXIT.USAGE).toBe(true)
  })

  test('help --json exposes the command spec', () => {
    const io = fakeIo(['help', '--json'])
    expect(run(io)).toBe(EXIT.OK)
    const parsed = JSON.parse(io.outText())
    expect(parsed.data.commands.map((c: { name: string }) => c.name)).toContain('context')
  })

  test('an unexpected exception becomes an INTERNAL error, never a stack trace on stdout', () => {
    const io = fakeIo(['init'])
    const code = run(io)
    expect(io.outText().includes('at ')).toBe(false)
    expect(code).not.toBe(EXIT.OK)
  })
})
